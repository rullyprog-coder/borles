import { createFileRoute } from "@tanstack/react-router";

// Membuat 10 akun siswa dummy per kelas (idempoten).
export const Route = createFileRoute("/api/public/seed-demo-students")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const PASSWORD = "Siswa@2026";

        const { data: classRows, error: classError } = await supabaseAdmin
          .from("classes")
          .select("id, name, major");
        if (classError) {
          return Response.json({ error: classError.message }, { status: 500 });
        }

        const { data: examRows } = await supabaseAdmin.from("exams").select("class_id");
        const examClassIds = new Set((examRows ?? []).map((e) => e.class_id));

        // satu kelas per nama; utamakan kelas yang punya ujian
        const chosen = new Map<string, { id: string; name: string; major: string | null }>();
        for (const c of classRows ?? []) {
          const prev = chosen.get(c.name);
          if (!prev || (examClassIds.has(c.id) && !examClassIds.has(prev.id))) {
            chosen.set(c.name, { id: c.id, name: c.name, major: c.major });
          }
        }

        const { data: staffRow } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "guru"])
          .limit(1)
          .maybeSingle();

        const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const byEmail = new Map(
          (existing?.users ?? []).map((u) => [String(u.email ?? "").toLowerCase(), u.id]),
        );

        const firstNames = [
          "Ahmad", "Siti", "Budi", "Dewi", "Rizky", "Nabila", "Fajar", "Intan", "Yoga", "Putri",
        ];
        const lastNames = [
          "Pratama", "Rahmawati", "Santoso", "Lestari", "Hidayat", "Safitri", "Nugroho", "Maharani", "Saputra", "Anggraini",
        ];

        const created: { email: string; name: string; class_name: string; created: boolean }[] = [];

        for (const klass of chosen.values()) {
          const level = klass.name.split(" ")[0]!.toLowerCase();
          for (let i = 1; i <= 10; i++) {
            const nomor = String(i).padStart(2, "0");
            const email = `siswa.${level}.${nomor}@demo.sch.id`;
            const fullName = `${firstNames[i - 1]} ${lastNames[i - 1]}`;
            const identifier = `${level.toUpperCase()}-2026${nomor}`;

            let userId = byEmail.get(email);
            let isNew = false;
            if (userId) {
              await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: PASSWORD,
                email_confirm: true,
              });
            } else {
              const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: PASSWORD,
                email_confirm: true,
                user_metadata: { full_name: fullName, identifier, class_name: klass.name },
              });
              if (error || !data?.user) {
                return Response.json({ error: `Gagal membuat ${email}`, details: error?.message }, { status: 500 });
              }
              userId = data.user.id;
              isNew = true;
            }

            await supabaseAdmin.from("profiles").upsert({
              id: userId,
              full_name: fullName,
              identifier,
              class_name: klass.name,
              major: klass.major,
            });
            await supabaseAdmin
              .from("user_roles")
              .upsert({ user_id: userId, role: "siswa" }, { onConflict: "user_id,role" });

            if (staffRow?.user_id) {
              const { data: enrolled } = await supabaseAdmin
                .from("class_students")
                .select("id")
                .eq("class_id", klass.id)
                .eq("student_id", userId)
                .maybeSingle();
              if (!enrolled) {
                await supabaseAdmin.from("class_students").insert({
                  class_id: klass.id,
                  student_id: userId,
                  created_by: staffRow.user_id,
                });
              }
            }

            created.push({ email, name: fullName, class_name: klass.name, created: isNew });
          }
        }

        return Response.json({ ok: true, password: PASSWORD, total: created.length, students: created });
      },
    },
  },
});
