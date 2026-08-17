import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import {
  CheckCircle2,
  Database,
  Download,
  FileArchive,
  Loader2,
  ShieldAlert,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BACKUP_BUCKETS,
  BACKUP_BUCKET_LABEL,
  BACKUP_TABLE_LABEL,
  MAX_BATCH_BYTES,
  RESTORABLE_TABLES,
} from "@/lib/backup-meta";
import {
  downloadAttachmentBatch,
  getBackupManifest,
  getSystemSnapshot,
  restoreTables,
  uploadAttachmentBatch,
  verifyAttachments,
} from "@/lib/backup.functions";

export const Route = createFileRoute("/_authenticated/backup")({
  head: () => ({
    meta: [
      { title: "Backup & Restore — SMK Borneo Lestari" },
      {
        name: "description",
        content:
          "Unduh salinan data portal ujian SMK Borneo Lestari beserta lampiran dalam berkas ZIP, lalu pulihkan dan validasi otomatis.",
      },
      { property: "og:title", content: "Backup & Restore Data" },
      {
        property: "og:description",
        content:
          "Cadangkan data akademik + lampiran PDF/gambar sebagai ZIP, pulihkan, dan validasi keterhubungan lampiran.",
      },
    ],
  }),
  component: BackupPage,
});

function formatTimestamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Membagi daftar lampiran menjadi batch sesuai batas byte agar aman lewat RPC. */
function batchByBytes<T extends { size: number }>(items: T[], maxBytes: number) {
  const batches: T[][] = [];
  let current: T[] = [];
  let total = 0;
  for (const item of items) {
    const size = Math.max(item.size, 1);
    if (current.length > 0 && (total + size > maxBytes || current.length >= 40)) {
      batches.push(current);
      current = [];
      total = 0;
    }
    current.push(item);
    total += size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

type Summary = {
  counts: Record<string, number>;
  totalRows: number;
  attachmentCount: number;
  attachmentBytes: number;
  byBucket: Record<string, number>;
  includedAttachments: number;
  skippedAttachments: string[];
};

type RestoreSummary = {
  restoredRows: number;
  restoredTables: Record<string, number>;
  restoredAttachments: number;
  failedAttachments: string[];
  mode: "data-saja" | "data-dan-sistem" | "tidak-diketahui";
  systemAccounts: number | null;
};


type Verification = Awaited<ReturnType<typeof verifyAttachments>>;

function BackupPage() {
  const { isAdmin, loading } = useCurrentUser();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [backupMode, setBackupMode] = useState<"data" | "full">("full");
  const includeAttachments = backupMode === "full";
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupStep, setBackupStep] = useState("");
  const [backupProgress, setBackupProgress] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreStep, setRestoreStep] = useState("");
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreSummary, setRestoreSummary] = useState<RestoreSummary | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);

  const runManifest = useServerFn(getBackupManifest);
  const runDownloadBatch = useServerFn(downloadAttachmentBatch);
  const runRestoreTables = useServerFn(restoreTables);
  const runUploadBatch = useServerFn(uploadAttachmentBatch);
  const runVerify = useServerFn(verifyAttachments);
  const runSystemSnapshot = useServerFn(getSystemSnapshot);

  async function handleBackup() {
    setBackupBusy(true);
    setBackupProgress(2);
    setBackupStep("Membaca data dari database…");
    setSummary(null);
    try {
      const manifest = await runManifest();
      const attachments = manifest.attachments;
      const attachmentBytes = attachments.reduce((a, f) => a + f.size, 0);

      const zipEntries: Record<string, Uint8Array> = {
        "data.json": strToU8(manifest.dataJson),
      };
      const skipped: string[] = [];
      let included = 0;

      if (includeAttachments && attachments.length > 0) {
        for (const bucket of BACKUP_BUCKETS) {
          const bucketFiles = attachments.filter((f) => f.bucket === bucket);
          const batches = batchByBytes(bucketFiles, MAX_BATCH_BYTES);
          for (const batch of batches) {
            setBackupStep(
              `Mengemas lampiran ${included + 1}–${included + batch.length} dari ${attachments.length}…`,
            );
            const res = await runDownloadBatch({
              data: { bucket, paths: batch.map((f) => f.path) },
            });
            for (const f of res.files) {
              zipEntries[`lampiran/${bucket}/${f.path}`] = base64ToBytes(f.data_base64);
              included++;
            }
            skipped.push(...res.skipped);
            setBackupProgress(
              Math.min(95, 10 + Math.round(((included + skipped.length) / attachments.length) * 85)),
            );
          }
        }
      }

      let accountCount = 0;
      if (backupMode === "full") {
        setBackupStep("Mengemas snapshot sistem…");
        try {
          const system = await runSystemSnapshot();
          zipEntries["sistem/snapshot-sistem.json"] = strToU8(system.snapshotJson);
          accountCount = system.accountCount;
        } catch (error) {
          toast.warning("Snapshot sistem dilewati: " + (error as Error).message);
        }
      }

      zipEntries["manifest.json"] = strToU8(
        JSON.stringify(
          {
            version: 3,
            mode: backupMode === "full" ? "data-dan-sistem" : "data-saja",
            created_at: new Date().toISOString(),
            counts: manifest.counts,
            total_rows: manifest.totalRows,
            attachments: attachments.length,
            attachments_included: included,
            attachments_skipped: skipped,
            system_accounts: accountCount,
          },
          null,
          2,
        ),
      );

      setBackupStep("Menyusun berkas ZIP…");
      setBackupProgress(97);
      const zipped = zipSync(zipEntries, { level: 6 });
      const blob = new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-borles-${backupMode === "full" ? "sistem" : "data"}-${formatTimestamp(new Date())}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setSummary({
        counts: manifest.counts,
        totalRows: manifest.totalRows,
        attachmentCount: attachments.length,
        attachmentBytes,
        byBucket: Object.fromEntries(
          BACKUP_BUCKETS.map((b) => [b, attachments.filter((f) => f.bucket === b).length]),
        ),
        includedAttachments: included,
        skippedAttachments: skipped,
      });
      setBackupProgress(100);
      setBackupStep("Backup selesai");
      toast.success(`Backup ZIP diunduh — ${manifest.totalRows} baris & ${included} lampiran`);
      if (skipped.length > 0) toast.warning(`${skipped.length} lampiran dilewati`);
    } catch (error) {
      toast.error("Backup gagal: " + (error as Error).message);
      setBackupStep("");
      setBackupProgress(0);
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleRestore(file: File) {
    setRestoreBusy(true);
    setRestoreProgress(3);
    setRestoreStep("Membaca berkas backup…");
    setRestoreSummary(null);
    setVerification(null);
    try {
      const isZip = file.name.toLowerCase().endsWith(".zip");
      let dataJson = "";
      let mode: RestoreSummary["mode"] = "tidak-diketahui";
      let systemAccounts: number | null = null;
      const attachmentEntries: { bucket: string; path: string; bytes: Uint8Array }[] = [];

      if (isZip) {
        const buffer = new Uint8Array(await file.arrayBuffer());
        const unzipped = unzipSync(buffer);
        const dataEntry = unzipped["data.json"];
        if (!dataEntry) throw new Error("ZIP tidak memuat data.json.");
        dataJson = strFromU8(dataEntry);

        // Kenali jenis backup dari manifest & snapshot sistem bila ada.
        const manifestEntry = unzipped["manifest.json"];
        if (manifestEntry) {
          try {
            const m = JSON.parse(strFromU8(manifestEntry)) as {
              mode?: string;
              system_accounts?: number;
            };
            if (m.mode === "data-dan-sistem" || m.mode === "data-saja") mode = m.mode;
            if (typeof m.system_accounts === "number") systemAccounts = m.system_accounts;
          } catch {
            // manifest rusak — abaikan, restore data tetap berjalan.
          }
        }
        const snapshotEntry = unzipped["sistem/snapshot-sistem.json"];
        if (snapshotEntry) {
          mode = "data-dan-sistem";
          if (systemAccounts === null) {
            try {
              const s = JSON.parse(strFromU8(snapshotEntry)) as { account_count?: number };
              if (typeof s.account_count === "number") systemAccounts = s.account_count;
            } catch {
              // snapshot rusak — abaikan.
            }
          }
        }

        for (const [name, bytes] of Object.entries(unzipped)) {
          if (!name.startsWith("lampiran/") || bytes.length === 0) continue;
          const rest = name.slice("lampiran/".length);
          const slash = rest.indexOf("/");
          if (slash <= 0) continue;
          const bucket = rest.slice(0, slash);
          const path = rest.slice(slash + 1);
          if (!BACKUP_BUCKETS.includes(bucket as (typeof BACKUP_BUCKETS)[number])) continue;
          attachmentEntries.push({ bucket, path, bytes });
        }
        if (mode === "tidak-diketahui")
          mode = attachmentEntries.length > 0 ? "data-dan-sistem" : "data-saja";
      } else {
        // Kompatibilitas berkas backup JSON lama (lampiran base64 di dalam JSON).
        dataJson = await file.text();
        const legacy = JSON.parse(dataJson) as {
          files?: Record<string, { path: string; data_base64: string }[]>;
        };
        for (const [bucket, list] of Object.entries(legacy.files ?? {})) {
          for (const entry of list) {
            attachmentEntries.push({ bucket, path: entry.path, bytes: base64ToBytes(entry.data_base64) });
          }
        }
        mode = attachmentEntries.length > 0 ? "data-dan-sistem" : "data-saja";
      }


      setRestoreStep("Memulihkan data akademik…");
      setRestoreProgress(12);
      const tablesResult = await runRestoreTables({ data: { payload: dataJson } });
      const restoredRows = Object.values(tablesResult.restored).reduce((a, b) => a + b, 0);

      let uploaded = 0;
      const failed: string[] = [];
      if (attachmentEntries.length > 0) {
        for (const bucket of BACKUP_BUCKETS) {
          const items = attachmentEntries
            .filter((e) => e.bucket === bucket)
            .map((e) => ({ ...e, size: e.bytes.length }));
          const batches = batchByBytes(items, MAX_BATCH_BYTES);
          for (const batch of batches) {
            setRestoreStep(
              `Mengunggah lampiran ${uploaded + 1}–${uploaded + batch.length} dari ${attachmentEntries.length}…`,
            );
            const res = await runUploadBatch({
              data: {
                bucket,
                files: batch.map((e) => ({ path: e.path, data_base64: bytesToBase64(e.bytes) })),
              },
            });
            uploaded += res.uploaded;
            failed.push(...res.failed);
            setRestoreProgress(
              Math.min(90, 15 + Math.round(((uploaded + failed.length) / attachmentEntries.length) * 75)),
            );
          }
        }
      }

      setRestoreStep("Memvalidasi lampiran & keterhubungan record…");
      setRestoreProgress(94);
      const verify = await runVerify();

      setRestoreSummary({
        restoredRows,
        restoredTables: tablesResult.restored,
        restoredAttachments: uploaded,
        failedAttachments: failed,
        mode,
        systemAccounts,

      });
      setVerification(verify);
      setRestoreProgress(100);
      setRestoreStep("Restore selesai");
      setPendingFile(null);
      if (fileInput.current) fileInput.current.value = "";
      queryClient.invalidateQueries();

      toast.success(`Restore selesai — ${restoredRows} baris & ${uploaded} lampiran dipulihkan`);
      for (const note of tablesResult.notes ?? []) toast.warning(note);
      if (verify.ok) toast.success("Validasi lampiran: semua lampiran terhubung ke recordnya");
      else toast.warning(`Validasi: ${verify.missingTotal} lampiran tidak ditemukan di penyimpanan`);
    } catch (error) {
      toast.error("Restore gagal: " + (error as Error).message);
      setRestoreStep("");
      setRestoreProgress(0);
    } finally {
      setRestoreBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader title="Backup & Restore" />
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Halaman ini hanya dapat diakses oleh administrator.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Backup & Restore"
        description="Cadangkan seluruh data portal ujian beserta lampiran dalam satu berkas ZIP, lalu pulihkan dengan validasi otomatis."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileArchive className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Buat Backup</h2>
              <p className="text-sm text-muted-foreground">
                Satu berkas ZIP: <code>data.json</code> + folder <code>lampiran/</code>.
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Berkas mencakup kelas, kurikulum, mata pelajaran, pertemuan, ujian, soal, bank soal,
            profil dan peran pengguna, penempatan siswa, percobaan ujian, serta jawaban siswa.
            Lampiran PDF/gambar disimpan sebagai berkas asli di dalam ZIP (bukan base64), sehingga
            pemulihan lebih mudah dan berkas dapat dibuka langsung.
          </p>

          <fieldset className="mt-4 space-y-2.5" disabled={backupBusy}>
            <legend className="mb-2 text-sm font-medium">Pilih jenis backup</legend>
            {(
              [
                {
                  value: "data" as const,
                  title: "Backup data saja",
                  desc: "Hanya data.json (kelas, kurikulum, mapel, ujian, soal, nilai). Ukuran kecil dan cepat.",
                },
                {
                  value: "full" as const,
                  title: "Backup data dan semua sistem",
                  desc: "data.json + seluruh lampiran PDF/gambar + snapshot sistem (daftar akun, bucket, struktur tabel).",
                },
              ]
            ).map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                  backupMode === option.value ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name="backup-mode"
                  className="mt-1 size-4 accent-[hsl(var(--primary))]"
                  checked={backupMode === option.value}
                  onChange={() => setBackupMode(option.value)}
                />
                <span>
                  <span className="font-medium">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{option.desc}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <Button className="mt-5" onClick={() => void handleBackup()} disabled={backupBusy}>
            {backupBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Unduh backup ZIP
          </Button>

          {(backupBusy || backupProgress > 0) && (
            <div className="mt-5 space-y-2">
              <Progress value={backupProgress} />
              <p className="text-xs text-muted-foreground">
                {backupStep} {backupProgress > 0 && `(${backupProgress}%)`}
              </p>
            </div>
          )}

          {summary && (
            <div className="mt-5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatBox label="Total baris data" value={String(summary.totalRows)} />
                <StatBox
                  label="Lampiran dalam ZIP"
                  value={`${summary.includedAttachments} / ${summary.attachmentCount}`}
                />
                <StatBox label="Ukuran lampiran" value={formatBytes(summary.attachmentBytes)} />
              </div>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Data</th>
                      <th className="px-3 py-2 text-right font-semibold">Baris</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.counts).map(([table, count]) => (
                      <tr key={table} className="border-t">
                        <td className="px-3 py-2">{BACKUP_TABLE_LABEL[table] ?? table}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{count}</td>
                      </tr>
                    ))}
                    {BACKUP_BUCKETS.map((bucket) => (
                      <tr key={bucket} className="border-t bg-muted/20">
                        <td className="px-3 py-2">{BACKUP_BUCKET_LABEL[bucket] ?? bucket}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {summary.byBucket[bucket] ?? 0}
                        </td>
                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>

              {summary.skippedAttachments.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {summary.skippedAttachments.length} lampiran dilewati (terlalu besar atau tidak
                  dapat diunduh).
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-gold/15 text-gold-foreground">
              <Upload className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Pulihkan (Restore)</h2>
              <p className="text-sm text-muted-foreground">
                Unggah berkas ZIP (atau JSON backup lama).
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-3 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold-foreground" />
            <p className="text-muted-foreground">
              Restore hanya menimpa data akademik:{" "}
              <span className="font-medium text-foreground">
                {RESTORABLE_TABLES.map((t) => BACKUP_TABLE_LABEL[t] ?? t).join(", ")}
              </span>
              . Lampiran dipulihkan ke penyimpanan, lalu divalidasi otomatis. Akun pengguna,
              percobaan ujian, dan jawaban siswa tidak diubah agar hasil ujian tetap aman.
            </p>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept=".zip,application/zip,application/json,.json"
            className="mt-4 block w-full cursor-pointer rounded-lg border bg-background p-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
            onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
          />

          {pendingFile && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                <Database className="size-4 text-muted-foreground" />
                <span className="font-medium">{pendingFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(pendingFile.size)}
                </span>
              </span>
              <Button
                size="sm"
                onClick={() => void handleRestore(pendingFile)}
                disabled={restoreBusy}
              >
                {restoreBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Pulihkan data
              </Button>
            </div>
          )}

          {(restoreBusy || restoreProgress > 0) && (
            <div className="mt-5 space-y-2">
              <Progress value={restoreProgress} />
              <p className="text-xs text-muted-foreground">
                {restoreStep} {restoreProgress > 0 && `(${restoreProgress}%)`}
              </p>
            </div>
          )}

          {restoreSummary && (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatBox label="Baris dipulihkan" value={String(restoreSummary.restoredRows)} />
                <StatBox
                  label="Lampiran dipulihkan"
                  value={String(restoreSummary.restoredAttachments)}
                />
              </div>
              <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">
                  Jenis backup terdeteksi:{" "}
                  {restoreSummary.mode === "data-dan-sistem"
                    ? "Data dan semua sistem"
                    : restoreSummary.mode === "data-saja"
                      ? "Data saja"
                      : "Tidak diketahui"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {restoreSummary.mode === "data-dan-sistem"
                    ? `Data akademik + lampiran dipulihkan. Snapshot sistem${restoreSummary.systemAccounts !== null ? ` (${restoreSummary.systemAccounts} akun)` : ""} hanya sebagai referensi — akun & peran pengguna tidak ditimpa demi keamanan.`
                    : "Berkas hanya memuat data akademik, jadi lampiran dan snapshot sistem tidak diubah."}
                </p>
              </div>
            </>

          )}

          {verification && (
            <div
              className={`mt-4 rounded-lg border p-3 text-sm ${verification.ok ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}
            >
              <p className="flex items-center gap-2 font-medium">
                {verification.ok ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : (
                  <TriangleAlert className="size-4 text-destructive" />
                )}
                Validasi otomatis lampiran
              </p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>
                  {verification.linked} dari {verification.expected} lampiran yang dirujuk record
                  akademik tersimpan &amp; terhubung.
                </li>
                <li>{verification.storedTotal} berkas ada di penyimpanan.</li>
                {verification.missingTotal > 0 && (
                  <li className="text-destructive">
                    {verification.missingTotal} lampiran hilang, mis.{" "}
                    {verification.missing
                      .slice(0, 3)
                      .map((m) => `${m.ref} → ${m.bucket}/${m.path}`)
                      .join("; ")}
                  </li>
                )}
                {verification.orphanTotal > 0 && (
                  <li>
                    {verification.orphanTotal} berkas di penyimpanan tanpa rujukan record (tidak
                    mengganggu, dapat diabaikan).
                  </li>
                )}
              </ul>
              {restoreSummary && restoreSummary.failedAttachments.length > 0 && (
                <p className="mt-2 text-xs text-destructive">
                  {restoreSummary.failedAttachments.length} lampiran gagal diunggah kembali.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
