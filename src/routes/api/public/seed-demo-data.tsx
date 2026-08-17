import { createFileRoute } from "@tanstack/react-router";

// Idempotent bootstrap for demo data: classes, subjects, meetings, exam, and questions.
// Safe to call repeatedly: it skips existing records and refreshes enrolments/profiles.
export const Route = createFileRoute("/api/public/seed-demo-data")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (usersError) {
          return Response.json({ error: "Gagal membaca user", details: usersError.message }, { status: 500 });
        }

        const byEmail = new Map(
          (users?.users ?? []).map((u) => [String(u.email ?? "").toLowerCase(), u.id]),
        );

        const adminId = byEmail.get("admin@demo.sch.id");
        const guruId = byEmail.get("guru@demo.sch.id");
        const siswaId = byEmail.get("siswa@demo.sch.id");
        const siswaXId = byEmail.get("siswa.x@demo.sch.id");
        const siswaXIId = byEmail.get("siswa.xi@demo.sch.id");
        const siswaXIIId = byEmail.get("siswa.xii@demo.sch.id");

        if (!adminId || !guruId) {
          return Response.json(
            { error: "Akun demo admin/guru belum dibuat. Jalankan /api/public/seed-demo terlebih dahulu." },
            { status: 400 },
          );
        }

        // --- Classes (SMK Farmasi) ---
        const classData = [
          { name: "X Farmasi 1", major: "Farmasi" },
          { name: "XI Farmasi 1", major: "Farmasi" },
          { name: "XII Farmasi 1", major: "Farmasi" },
        ];
        const { data: existingClasses } = await supabaseAdmin.from("classes").select("id, name");
        const classUpserts = classData.map((c) => {
          const existing = existingClasses?.find((e) => e.name === c.name);
          return { id: existing?.id ?? crypto.randomUUID(), ...c };
        });
        const { error: classError } = await supabaseAdmin.from("classes").upsert(classUpserts, { onConflict: "id" });

        if (classError) {
          return Response.json({ error: "Gagal membuat kelas", details: classError.message }, { status: 500 });
        }
        const classMap = new Map(classUpserts.map((c) => [c.name, c.id]));

        // --- Curricula per tingkat (SMK Farmasi) ---
        const curriculumData = [
          {
            name: "Dasar-dasar Teknologi Farmasi",
            description: "Kelas X - dasar-dasar teknologi/farmasi dan mata pelajaran umum",
            className: "X Farmasi 1",
          },
          {
            name: "Pendalaman Kompetensi Farmasi Klinis dan Komunitas",
            description: "Kelas XI - pendalaman kompetensi farmasi klinis dan komunitas",
            className: "XI Farmasi 1",
          },
          {
            name: "Pendalaman Lanjutan, PKL, dan Persiapan Dunia Kerja",
            description:
              "Kelas XII - pendalaman lanjutan kompetensi farmasi, praktik kerja lapangan (PKL), dan persiapan dunia kerja",
            className: "XII Farmasi 1",
          },
        ];
        const { data: existingCurricula } = await supabaseAdmin.from("curricula").select("id, name");
        const curriculumUpserts = curriculumData.map((c) => {
          const existing = existingCurricula?.find((e) => e.name === c.name);
          return {
            id: existing?.id ?? crypto.randomUUID(),
            name: c.name,
            description: c.description,
            class_id: classMap.get(c.className)!,
            is_active: true,
          };
        });
        const { error: curriculumError } = await supabaseAdmin
          .from("curricula")
          .upsert(curriculumUpserts, { onConflict: "id" });
        if (curriculumError) {
          return Response.json({ error: "Gagal membuat kurikulum", details: curriculumError.message }, { status: 500 });
        }
        const curriculumMap = new Map(curriculumUpserts.map((c) => [c.name, c.id]));

        // --- Subjects per kurikulum ---
        const commonX = [
          ["Pendidikan Agama dan Budi Pekerti", "PABP-X"],
          ["Pendidikan Pancasila", "PPKN-X"],
          ["Bahasa Indonesia", "BIND-X"],
          ["Matematika", "MAT-X"],
          ["Bahasa Inggris", "BING-X"],
          ["Pendidikan Jasmani, Olahraga, dan Kesehatan", "PJOK-X"],
          ["Sejarah", "SEJ-X"],
          ["Seni dan Budaya", "SENI-X"],
          ["Dasar-Dasar Teknologi Farmasi", "DDTF-X"],
          ["Muatan Lokal", "MULOK-X"],
        ] as const;
        const commonXI = [
          ["Pendidikan Agama dan Budi Pekerti", "PABP-XI"],
          ["Pendidikan Pancasila", "PPKN-XI"],
          ["Bahasa Indonesia", "BIND-XI"],
          ["Matematika", "MAT-XI"],
          ["Bahasa Inggris", "BING-XI"],
          ["Pendidikan Jasmani, Olahraga, dan Kesehatan", "PJOK-XI"],
          ["Farmasi Klinis dan Komunitas", "FKK-XI"],
          ["Projek Kreatif dan Kewirausahaan", "PKK-XI"],
          ["Praktik Kerja Lapangan (PKL)", "PKL-XI"],
        ] as const;
        const commonXII = [
          ["Pendidikan Agama dan Budi Pekerti", "PABP-XII"],
          ["Pendidikan Pancasila", "PPKN-XII"],
          ["Bahasa Indonesia", "BIND-XII"],
          ["Matematika", "MAT-XII"],
          ["Bahasa Inggris", "BING-XII"],
          ["Farmasi Klinis dan Komunitas", "FKK-XII"],
          ["Projek Kreatif dan Kewirausahaan", "PKK-XII"],
          ["Praktik Kerja Lapangan (PKL)", "PKL-XII"],
        ] as const;

        const subjectData: { name: string; code: string; curriculum: string }[] = [
          ...commonX.map(([name, code]) => ({ name, code, curriculum: "Dasar-dasar Teknologi Farmasi" })),
          ...commonXI.map(([name, code]) => ({
            name,
            code,
            curriculum: "Pendalaman Kompetensi Farmasi Klinis dan Komunitas",
          })),
          ...commonXII.map(([name, code]) => ({
            name,
            code,
            curriculum: "Pendalaman Lanjutan, PKL, dan Persiapan Dunia Kerja",
          })),
        ];

        const { data: existingSubjects } = await supabaseAdmin.from("subjects").select("id, code");
        const subjectUpserts = subjectData.map((s) => {
          const existing = existingSubjects?.find((e) => e.code === s.code);
          return {
            id: existing?.id ?? crypto.randomUUID(),
            name: s.name,
            code: s.code,
            curriculum_id: curriculumMap.get(s.curriculum)!,
          };
        });
        const { error: subjectError } = await supabaseAdmin
          .from("subjects")
          .upsert(subjectUpserts, { onConflict: "id" });

        if (subjectError) {
          return Response.json({ error: "Gagal membuat mata pelajaran", details: subjectError.message }, { status: 500 });
        }
        const subjectMap = new Map(subjectUpserts.map((s) => [s.code, s.id]));

        // --- Profiles ---
        const profileData = [
          { id: adminId, full_name: "Admin Demo", identifier: "000001", class_name: null, major: null },
          { id: guruId, full_name: "Guru Demo", identifier: "000002", class_name: null, major: null },
          { id: siswaXId, full_name: "Siswa Demo Kelas X", identifier: "100010", class_name: "X Farmasi 1", major: "Farmasi" },
          { id: siswaXIId, full_name: "Siswa Demo Kelas XI", identifier: "110011", class_name: "XI Farmasi 1", major: "Farmasi" },
          { id: siswaXIIId, full_name: "Siswa Demo Kelas XII", identifier: "120012", class_name: "XII Farmasi 1", major: "Farmasi" },
          { id: siswaId, full_name: "Siswa Demo", identifier: "000003", class_name: "XII Farmasi 1", major: "Farmasi" },
        ].filter((p) => p.id) as { id: string; full_name: string; identifier: string; class_name: string | null; major: string | null }[];

        const { error: profileError } = await supabaseAdmin.from("profiles").upsert(profileData, { onConflict: "id" });
        if (profileError) {
          return Response.json({ error: "Gagal memperbarui profil", details: profileError.message }, { status: 500 });
        }

        // --- Enrolments ---
        const enrolments = [
          { class_name: "X Farmasi 1", student_id: siswaXId },
          { class_name: "XI Farmasi 1", student_id: siswaXIId },
          { class_name: "XII Farmasi 1", student_id: siswaXIIId },
          { class_name: "XII Farmasi 1", student_id: siswaId },
        ].filter((e) => e.student_id) as { class_name: string; student_id: string }[];

        for (const e of enrolments) {
          const classId = classMap.get(e.class_name);
          if (!classId) continue;
          const { data: existing } = await supabaseAdmin
            .from("class_students")
            .select("id")
            .eq("class_id", classId)
            .eq("student_id", e.student_id)
            .maybeSingle();
          if (!existing) {
            await supabaseAdmin.from("class_students").insert({
              class_id: classId,
              student_id: e.student_id,
              created_by: guruId,
            });
          }
        }

        // --- Meeting ---
        const meetingClassId = classMap.get("XII Farmasi 1")!;
        const meetingSubjectId = subjectMap.get("FARMK-XII")!;
        const { data: existingMeeting } = await supabaseAdmin
          .from("meetings")
          .select("id")
          .eq("class_id", meetingClassId)
          .eq("subject_id", meetingSubjectId)
          .eq("title", "Farmakologi - Pertemuan 1")
          .maybeSingle();

        const meetingId = existingMeeting?.id ?? crypto.randomUUID();
        if (!existingMeeting) {
          const { error: meetingError } = await supabaseAdmin.from("meetings").insert({
            id: meetingId,
            class_id: meetingClassId,
            subject_id: meetingSubjectId,
            title: "Farmakologi - Pertemuan 1",
            description: "Pengenalan farmakologi dan bentuk sediaan obat",
            order_index: 1,
            created_by: guruId,
          });
          if (meetingError) {
            return Response.json({ error: "Gagal membuat pertemuan", details: meetingError.message }, { status: 500 });
          }
        }

        // --- Exam ---
        const { data: existingExam } = await supabaseAdmin
          .from("exams")
          .select("id")
          .eq("title", "Ujian Harian Farmakologi")
          .maybeSingle();

        const examId = existingExam?.id ?? crypto.randomUUID();
        if (!existingExam) {
          const now = new Date();
          const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const { error: examError } = await supabaseAdmin.from("exams").insert({
            id: examId,
            meeting_id: meetingId,
            class_id: meetingClassId,
            subject_id: meetingSubjectId,
            title: "Ujian Harian Farmakologi",
            description: "Demo ujian harian Farmakologi untuk kelas XII Farmasi 1.",
            duration_minutes: 30,
            start_at: now.toISOString(),
            end_at: endAt.toISOString(),
            is_published: true,
            created_by: guruId,
          });
          if (examError) {
            return Response.json({ error: "Gagal membuat ujian", details: examError.message }, { status: 500 });
          }
        }

        // --- Questions ---
        const questionData = [
          {
            exam_id: examId,
            type: "single",
            content: "Apa fungsi utama sistem pencernaan manusia?",
            options: [
              { id: "a", text: "Mengubah makanan menjadi zat gizi yang dapat diserap tubuh" },
              { id: "b", text: "Mengangkut oksigen ke seluruh tubuh" },
              { id: "c", text: "Mengatur suhu tubuh agar tetap stabil" },
              { id: "d", text: "Menjaga keseimbangan hormon" },
            ],
            correct_answers: ["a"],
            points: 20,
            order_index: 1,
          },
          {
            exam_id: examId,
            type: "multiple",
            content: "Pilih bentuk sediaan farmasi yang umum digunakan:",
            options: [
              { id: "a", text: "Tablet" },
              { id: "b", text: "Kapsul" },
              { id: "c", text: "Sirup" },
              { id: "d", text: "Laptop" },
            ],
            correct_answers: ["a", "b", "c"],
            points: 20,
            order_index: 2,
          },
          {
            exam_id: examId,
            type: "file",
            content: "Upload contoh label obat bebas terbatas (OTB) beserta penjelasan fungsi dan cara penyimpanan yang benar.",
            options: [],
            correct_answers: [],
            points: 40,
            order_index: 3,
          },
        ];

        for (const q of questionData) {
          const { data: existing } = await supabaseAdmin
            .from("questions")
            .select("id")
            .eq("exam_id", examId)
            .eq("order_index", q.order_index)
            .maybeSingle();
          if (!existing) {
            const { error: questionError } = await supabaseAdmin.from("questions").insert({
              id: crypto.randomUUID(),
              ...q,
            });
            if (questionError) {
              return Response.json({ error: "Gagal membuat soal", details: questionError.message }, { status: 500 });
            }
          }
        }

        return Response.json({
          ok: true,
          examId,
          meetingId,
          classes: Array.from(classMap.entries()).map(([name, id]) => ({ name, id })),
          subjects: Array.from(subjectMap.entries()).map(([code, id]) => ({ code, id })),
          enrolled: enrolments.length,
        });
      },
    },
  },
});
