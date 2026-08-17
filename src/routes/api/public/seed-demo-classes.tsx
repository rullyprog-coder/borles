import { createFileRoute } from "@tanstack/react-router";

// Idempotent bootstrap for one-click demo student accounts (kelas X, XI, XII).
// Safe to call repeatedly: existing accounts get their password/profile/enrolment refreshed.
export const Route = createFileRoute("/api/public/seed-demo-classes")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const DEMO_PASSWORD = "Borneo@Lestari2026";
        const demos = [
          {
            email: "siswa.x@demo.sch.id",
            full_name: "Siswa Demo Kelas X",
            identifier: "100010",
            level: "X",
          },
          {
            email: "siswa.xi@demo.sch.id",
            full_name: "Siswa Demo Kelas XI",
            identifier: "110011",
            level: "XI",
          },
          {
            email: "siswa.xii@demo.sch.id",
            full_name: "Siswa Demo Kelas XII",
            identifier: "120012",
            level: "XII",
          },
        ];

        const { data: classRows, error: classError } = await supabaseAdmin
          .from("classes")
          .select("id, name, major");
        if (classError) {
          return Response.json({ error: "Gagal membaca kelas", details: classError.message }, { status: 500 });
        }

        // staff owner for class_students.created_by
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

        const result: { email: string; class_name: string | null; created: boolean }[] = [];

        for (const demo of demos) {
          const klass =
            (classRows ?? []).find((c) => c.name.split(" ")[0] === demo.level) ?? null;

          let userId = byEmail.get(demo.email);
          let created = false;

          if (userId) {
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              password: DEMO_PASSWORD,
              email_confirm: true,
            });
          } else {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
              email: demo.email,
              password: DEMO_PASSWORD,
              email_confirm: true,
              user_metadata: {
                full_name: demo.full_name,
                identifier: demo.identifier,
                class_name: klass?.name ?? null,
              },
            });
            if (error || !data?.user) {
              return Response.json(
                { error: `Gagal membuat ${demo.email}`, details: error?.message },
                { status: 500 },
              );
            }
            userId = data.user.id;
            created = true;
          }

          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            full_name: demo.full_name,
            identifier: demo.identifier,
            class_name: klass?.name ?? null,
            major: klass?.major ?? null,
          });

          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role: "siswa" }, { onConflict: "user_id,role" });

          if (klass && staffRow?.user_id) {
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

          result.push({ email: demo.email, class_name: klass?.name ?? null, created });
        }

        return Response.json({ ok: true, accounts: result });
      },
    },
  },
});
