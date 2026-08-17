import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Daftar email akun (khusus administrator) untuk ditampilkan di manajemen pengguna. */
export const adminListUserEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Hanya administrator yang dapat melihat email pengguna.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emails: { id: string; email: string; last_sign_in_at: string | null }[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listError) throw new Error(listError.message);
      const users = data?.users ?? [];
      for (const u of users) {
        emails.push({
          id: u.id,
          email: u.email ?? "",
          last_sign_in_at: u.last_sign_in_at ?? null,
        });
      }
      if (users.length < 200) break;
    }
    return emails;
  });

/** Administrator memperbarui data pengguna (nama, NIS/NIP, kelas, jurusan, email). */
export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        full_name: z.string().trim().min(3).max(100),
        identifier: z.string().trim().max(30).optional(),
        class_name: z.string().trim().max(30).optional(),
        major: z.string().trim().max(60).optional(),
        email: z.string().trim().email().max(255).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Hanya administrator yang dapat mengubah data pengguna.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        identifier: data.identifier ?? null,
        class_name: data.class_name ?? null,
        major: data.major ?? null,
      })
      .eq("id", data.user_id);
    if (profileError) throw new Error(`Gagal memperbarui profil: ${profileError.message}`);

    let emailUpdated = false;
    if (data.email) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        email: data.email,
        email_confirm: true,
        user_metadata: {
          full_name: data.full_name,
          identifier: data.identifier ?? null,
          class_name: data.class_name ?? null,
        },
      });
      if (emailError) throw new Error(`Gagal memperbarui email: ${emailError.message}`);
      emailUpdated = true;
    }

    return { ok: true, emailUpdated };
  });

/** Administrator menyetel ulang kata sandi pengguna. */
export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ user_id: z.string().uuid(), password: z.string().min(8).max(72) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Hanya administrator yang dapat menyetel ulang kata sandi.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (resetError) throw new Error(`Gagal menyetel ulang kata sandi: ${resetError.message}`);
    return { ok: true };
  });
