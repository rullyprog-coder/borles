import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Ringkasan isi backup: seluruh baris tabel + daftar lampiran (tanpa isi berkas). */
export const getBackupManifest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, listBucketFiles } = await import("@/lib/backup.server");
    const { BACKUP_TABLES, BACKUP_BUCKETS } = await import("@/lib/backup-meta");
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tables: Record<string, Record<string, unknown>[]> = {};
    const counts: Record<string, number> = {};
    for (const table of BACKUP_TABLES) {
      const { data, error } = await supabaseAdmin.from(table).select("*");
      if (error) throw new Error(`Gagal membaca tabel ${table}: ${error.message}`);
      tables[table] = (data ?? []) as Record<string, unknown>[];
      counts[table] = tables[table]!.length;
    }

    const storage = supabaseAdmin.storage as never;
    const attachments: { bucket: string; path: string; size: number }[] = [];
    for (const bucket of BACKUP_BUCKETS) {
      const files = await listBucketFiles(storage, bucket);
      for (const f of files) attachments.push({ bucket, path: f.path, size: f.size });
    }

    return {
      dataJson: JSON.stringify(
        {
          version: 3,
          created_at: new Date().toISOString(),
          school: "SMK Borneo Lestari",
          tables,
        },
        null,
        2,
      ),
      counts,
      attachments,
      totalRows: Object.values(counts).reduce((a, b) => a + b, 0),
    };
  });

/** Mengunduh satu batch lampiran sebagai base64 untuk dimasukkan ke ZIP di sisi klien. */
export const downloadAttachmentBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ bucket: z.string().min(1), paths: z.array(z.string().min(1)).max(200) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, toBase64 } = await import("@/lib/backup.server");
    const { MAX_FILE_BYTES } = await import("@/lib/backup-meta");
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const files: { path: string; content_type?: string; data_base64: string }[] = [];
    const skipped: string[] = [];
    for (const path of data.paths) {
      const { data: blob, error } = await supabaseAdmin.storage.from(data.bucket).download(path);
      if (error || !blob || blob.size > MAX_FILE_BYTES) {
        skipped.push(`${data.bucket}/${path}`);
        continue;
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      files.push({
        path,
        ...(blob.type ? { content_type: blob.type } : {}),
        data_base64: toBase64(bytes),
      });
    }
    return { files, skipped };
  });

/** Memulihkan data akademik dari isi data.json pada berkas backup. */
export const restoreTables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ payload: z.string().min(2).max(60_000_000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/backup.server");
    const { RESTORABLE_TABLES, BACKUP_TABLE_LABEL } = await import("@/lib/backup-meta");
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let parsed: unknown;
    try {
      parsed = JSON.parse(data.payload);
    } catch {
      throw new Error("Berkas backup tidak valid: bukan JSON yang benar.");
    }
    const file = z
      .object({
        version: z.number().int().positive(),
        tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
      })
      .safeParse(parsed);
    if (!file.success) throw new Error("Struktur berkas backup tidak dikenali.");

    const restored: Record<string, number> = {};
    const skipped: string[] = [];
    const notes: string[] = [];

    // Bebaskan kunci unik `subjects.code`: baris lama dengan kode sama tapi id berbeda
    // akan diberi kode sementara agar baris dari backup bisa masuk dengan id aslinya.
    const staleSubjectIds: string[] = [];
    const incomingSubjects = file.data.tables["subjects"] ?? [];
    if (incomingSubjects.length > 0) {
      const incomingIds = new Set(incomingSubjects.map((r) => String(r["id"])));
      const incomingCodes = new Set(
        incomingSubjects.map((r) => String(r["code"] ?? "")).filter(Boolean),
      );
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("subjects")
        .select("id, code");
      if (existingError)
        throw new Error(`Gagal membaca Mata Pelajaran: ${existingError.message}`);
      for (const row of existing ?? []) {
        const id = String(row.id);
        const code = String(row.code ?? "");
        if (!code || incomingIds.has(id) || !incomingCodes.has(code)) continue;
        const { error: renameError } = await supabaseAdmin
          .from("subjects")
          .update({ code: `${code}~lama~${id.slice(0, 8)}`.slice(0, 60) })
          .eq("id", id);
        if (renameError)
          throw new Error(`Gagal memulihkan Mata Pelajaran: ${renameError.message}`);
        staleSubjectIds.push(id);
      }
    }

    for (const table of RESTORABLE_TABLES) {
      const rows = file.data.tables[table];
      if (!rows || rows.length === 0) {
        skipped.push(table);
        continue;
      }
      const { error } = await supabaseAdmin.from(table).upsert(rows as never, { onConflict: "id" });
      if (error)
        throw new Error(`Gagal memulihkan ${BACKUP_TABLE_LABEL[table] ?? table}: ${error.message}`);
      restored[table] = rows.length;
    }

    // Bersihkan baris duplikat lama bila sudah tidak dirujuk data lain.
    let leftover = 0;
    for (const id of staleSubjectIds) {
      const { error } = await supabaseAdmin.from("subjects").delete().eq("id", id);
      if (error) leftover++;
    }
    if (leftover > 0)
      notes.push(
        `${leftover} mata pelajaran lama dengan kode duplikat masih dirujuk data lain, kodenya diberi akhiran "~lama~".`,
      );

    return { restored, skipped, notes };
  });

/** Mengunggah kembali satu batch lampiran ke storage. */
export const uploadAttachmentBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        bucket: z.string().min(1),
        files: z
          .array(
            z.object({
              path: z.string().min(1),
              content_type: z.string().optional(),
              data_base64: z.string(),
            }),
          )
          .max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, fromBase64 } = await import("@/lib/backup.server");
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let uploaded = 0;
    const failed: string[] = [];
    for (const entry of data.files) {
      try {
        const bytes = fromBase64(entry.data_base64);
        const { error } = await supabaseAdmin.storage.from(data.bucket).upload(entry.path, bytes, {
          upsert: true,
          ...(entry.content_type ? { contentType: entry.content_type } : {}),
        });
        if (error) failed.push(`${data.bucket}/${entry.path}`);
        else uploaded++;
      } catch {
        failed.push(`${data.bucket}/${entry.path}`);
      }
    }
    return { uploaded, failed };
  });

/**
 * Validasi otomatis setelah restore: memastikan setiap lampiran yang dirujuk
 * record akademik benar-benar ada di storage, dan mencatat berkas tanpa rujukan.
 */
export const verifyAttachments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, listBucketFiles } = await import("@/lib/backup.server");
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const storage = supabaseAdmin.storage as never;
    const stored: Record<string, Set<string>> = {
      "exam-uploads": new Set((await listBucketFiles(storage, "exam-uploads")).map((f) => f.path)),
      "question-images": new Set(
        (await listBucketFiles(storage, "question-images")).map((f) => f.path),
      ),
    };

    const { data: answers, error: answersError } = await supabaseAdmin
      .from("answers")
      .select("id, attempt_id, question_id, file_url, file_name")
      .not("file_url", "is", null);
    if (answersError) throw new Error(`Gagal memeriksa jawaban: ${answersError.message}`);

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("questions")
      .select("id, exam_id, image_url")
      .not("image_url", "is", null);
    if (questionsError) throw new Error(`Gagal memeriksa soal: ${questionsError.message}`);

    const referenced = { "exam-uploads": new Set<string>(), "question-images": new Set<string>() };
    const missing: { bucket: string; path: string; ref: string }[] = [];

    for (const a of answers ?? []) {
      const path = a.file_url as string;
      referenced["exam-uploads"].add(path);
      if (!stored["exam-uploads"]!.has(path))
        missing.push({
          bucket: "exam-uploads",
          path,
          ref: `Jawaban siswa (${a.file_name ?? a.id})`,
        });
    }
    for (const q of questions ?? []) {
      const path = q.image_url as string;
      referenced["question-images"].add(path);
      if (!stored["question-images"]!.has(path))
        missing.push({ bucket: "question-images", path, ref: `Gambar soal (${q.id})` });
    }

    const orphan: { bucket: string; path: string }[] = [];
    for (const bucket of ["exam-uploads", "question-images"] as const) {
      for (const path of stored[bucket]!) {
        if (!referenced[bucket].has(path)) orphan.push({ bucket, path });
      }
    }

    const expected = referenced["exam-uploads"].size + referenced["question-images"].size;
    return {
      expected,
      linked: expected - missing.length,
      storedTotal: stored["exam-uploads"]!.size + stored["question-images"]!.size,
      missing: missing.slice(0, 50),
      missingTotal: missing.length,
      orphan: orphan.slice(0, 50),
      orphanTotal: orphan.length,
      ok: missing.length === 0,
    };
  });

/** Snapshot sistem: daftar akun, bucket penyimpanan, dan struktur tabel (untuk backup penuh). */
export const getSystemSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/backup.server");
    const { BACKUP_TABLES, BACKUP_BUCKETS } = await import("@/lib/backup-meta");
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const accounts: { id: string; email: string | null; created_at: string }[] = [];
    try {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of data?.users ?? []) {
        accounts.push({ id: u.id, email: u.email ?? null, created_at: u.created_at });
      }
    } catch {
      // Daftar akun tidak tersedia — snapshot tetap dibuat tanpa bagian ini.
    }

    const columns: Record<string, string[]> = {};
    for (const table of BACKUP_TABLES) {
      const { data } = await supabaseAdmin.from(table).select("*").limit(1);
      const row = (data ?? [])[0] as Record<string, unknown> | undefined;
      columns[table] = row ? Object.keys(row) : [];
    }

    return {
      snapshotJson: JSON.stringify(
        {
          version: 1,
          created_at: new Date().toISOString(),
          school: "SMK Borneo Lestari",
          accounts,
          account_count: accounts.length,
          buckets: BACKUP_BUCKETS,
          tables: BACKUP_TABLES,
          table_columns: columns,
        },
        null,
        2,
      ),
      accountCount: accounts.length,
    };
  });
