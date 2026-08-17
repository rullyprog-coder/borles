import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  full_name: z.string().trim().min(3).max(100),
  identifier: z.string().trim().max(30).optional(),
  class_name: z.string().trim().max(30).optional(),
});

export const createStudentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isStaff, error: roleError } = await context.supabase.rpc("is_staff", {
      _user_id: context.userId,
    });
    if (roleError) throw new Error(roleError.message);
    if (!isStaff) throw new Error("Hanya guru atau administrator yang dapat mendaftarkan siswa.");

    const url = process.env["SUPABASE_URL"]!;
    const anonKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;

    const signupResponse = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        data: {
          full_name: data.full_name,
          identifier: data.identifier ?? null,
          class_name: data.class_name ?? null,
        },
      }),
    });
    const signup = (await signupResponse.json()) as {
      msg?: string;
      error_description?: string;
      access_token?: string;
      user?: { id?: string };
      id?: string;
    };
    if (!signupResponse.ok) {
      throw new Error(signup.msg ?? signup.error_description ?? "Gagal membuat akun siswa");
    }

    const studentId = signup.user?.id ?? signup.id;
    const token = signup.access_token;

    // Lengkapi profil siswa memakai sesi akun yang baru dibuat (RLS: milik sendiri).
    if (token) {
      await fetch(`${url}/rest/v1/rpc/ensure_profile`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _full_name: data.full_name,
          ...(data.identifier ? { _identifier: data.identifier } : {}),
          ...(data.class_name ? { _class_name: data.class_name } : {}),
        }),
      });
    }

    return { id: studentId ?? null, email: data.email, full_name: data.full_name };
  });
