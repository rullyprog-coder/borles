import { createFileRoute } from "@tanstack/react-router";

// One-time bootstrap for demo accounts. Only works when the project has no auth users.
// After seeding, this endpoint returns {"already": true} and does not recreate users.
export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { count, error: countError } = await supabaseAdmin
          .from("user_roles")
          .select("*", { count: "exact", head: true });

        if (countError) {
          return Response.json({ error: "Database check failed", details: countError.message }, { status: 500 });
        }
        if (count && count > 0) {
          return Response.json({ already: true, message: "Demo accounts already seeded" });
        }

        const DEMO_PASSWORD = "Borneo@Lestari2026";
        const accounts = [
          { email: "admin@demo.sch.id", full_name: "Admin Demo", role: "admin" as const, identifier: "000001" },
          { email: "guru@demo.sch.id", full_name: "Guru Demo", role: "guru" as const, identifier: "000002" },
          { email: "siswa@demo.sch.id", full_name: "Siswa Demo", role: "siswa" as const, identifier: "000003", class_name: "XII TKJ 1" },
        ];

        const created: { email: string; role: string }[] = [];

        for (const acc of accounts) {
          const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: acc.email,
            password: DEMO_PASSWORD,
            email_confirm: true,
            user_metadata: {
              full_name: acc.full_name,
              identifier: acc.identifier,
              class_name: acc.class_name ?? null,
            },
          });

          if (createError || !user?.user) {
            return Response.json(
              { error: `Failed to create ${acc.email}`, details: createError?.message },
              { status: 500 },
            );
          }

          const userId = user.user.id;

          await supabaseAdmin.rpc("ensure_profile", {
            _full_name: acc.full_name,
            _identifier: acc.identifier,
            ...(acc.class_name ? { _class_name: acc.class_name } : {}),
          });

          const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
            user_id: userId,
            role: acc.role,
          });

          if (roleError) {
            return Response.json({ error: `Failed to assign role for ${acc.email}`, details: roleError.message }, { status: 500 });
          }

          created.push({ email: acc.email, role: acc.role });
        }

        return Response.json({ ok: true, created, password: DEMO_PASSWORD });
      },
    },
  },
});
