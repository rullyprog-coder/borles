import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "masuk" | "daftar" } => ({
    mode: search["mode"] === "daftar" ? "daftar" : "masuk",
  }),

  head: () => ({
    meta: [
      { title: "Masuk — Ujian Online SMK Borneo Lestari" },
      {
        name: "description",
        content: "Masuk atau daftar akun untuk mengikuti dan mengelola ujian online sekolah.",
      },
      { property: "og:title", content: "Masuk — Ujian Online SMK Borneo Lestari" },
      {
        property: "og:description",
        content: "Portal autentikasi untuk admin, guru, dan siswa SMK Borneo Lestari.",
      },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email tidak valid" }).max(255),
  password: z.string().min(6, { message: "Kata sandi minimal 6 karakter" }).max(72),
});

const registerSchema = loginSchema.extend({
  full_name: z.string().trim().min(3, { message: "Nama minimal 3 karakter" }).max(100),
  identifier: z.string().trim().max(30).optional(),
  class_name: z.string().trim().max(30).optional(),
});

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@demo.sch.id" },
  { label: "Guru", email: "guru@demo.sch.id" },
  { label: "Siswa Kelas X", email: "siswa.x@demo.sch.id" },
  { label: "Siswa Kelas XI", email: "siswa.xi@demo.sch.id" },
  { label: "Siswa Kelas XII", email: "siswa.xii@demo.sch.id" },
] as const;
const DEMO_PASSWORD = "Borneo@Lestari2026";


function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (!error) await supabase.rpc("ensure_profile", {});
    setLoading(false);
    if (error) {
      toast.error("Gagal masuk: " + error.message);
      return;
    }
    toast.success("Berhasil masuk");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleDemoLogin(demoEmail: string) {
    setDemoLoading(demoEmail);
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);

    let { error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: DEMO_PASSWORD,
    });

    if (error) {
      // Akun demo belum dibuat di proyek ini — buat dulu, lalu coba lagi.
      await fetch("/api/public/seed-demo", { method: "POST" }).catch(() => null);
      await fetch("/api/public/seed-demo-classes", { method: "POST" }).catch(() => null);
      await fetch("/api/public/seed-demo-data", { method: "POST" }).catch(() => null);
      ({ error } = await supabase.auth.signInWithPassword({

        email: demoEmail,
        password: DEMO_PASSWORD,
      }));
    }

    if (error) {
      setDemoLoading(null);
      toast.error("Gagal masuk akun demo: " + error.message);
      return;
    }

    await supabase.rpc("ensure_profile", {});
    setDemoLoading(null);
    toast.success("Berhasil masuk sebagai akun demo");
    navigate({ to: "/dashboard", replace: true });
  }



  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
      full_name: form.get("full_name"),
      identifier: form.get("identifier") || undefined,
      class_name: form.get("class_name") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.full_name,
          identifier: parsed.data.identifier ?? null,
          class_name: parsed.data.class_name ?? null,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Gagal mendaftar: " + error.message);
      return;
    }
    if (data.session) {
      await supabase.rpc("ensure_profile", {
        _full_name: parsed.data.full_name,
        ...(parsed.data.identifier ? { _identifier: parsed.data.identifier } : {}),
        ...(parsed.data.class_name ? { _class_name: parsed.data.class_name } : {}),
      });
      toast.success("Akun dibuat, selamat datang!");
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.success("Akun dibuat. Silakan cek email untuk konfirmasi.");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden gradient-hero p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary-foreground/15">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="font-display font-bold">SMK Borneo Lestari</p>
            <p className="text-xs text-primary-foreground/75">Banjarbaru • Akreditasi A</p>
          </div>
        </Link>
        <div>
          <h2 className="font-display text-3xl font-bold">
            Ujian berbasis komputer yang <span className="text-gradient-gold">aman & modern</span>
          </h2>
          <p className="mt-3 max-w-md text-primary-foreground/80">
            Masuk menggunakan akun sekolah Anda untuk mengelola atau mengikuti ujian.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">Agamis • Santun • Inovatif • Kompetetif</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-block text-sm text-muted-foreground lg:hidden">
            ← Kembali ke beranda
          </Link>
          <h1 className="font-display text-2xl font-bold">Portal Ujian Online</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gunakan email dan kata sandi yang terdaftar di sekolah.
          </p>

          <Tabs defaultValue={mode ?? "masuk"} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="masuk">Masuk</TabsTrigger>
              <TabsTrigger value="daftar">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="masuk">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={255}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@smkborneolestari.sch.id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Kata Sandi</Label>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Masuk
                </Button>

                <div className="rounded-lg border border-dashed bg-muted/40 p-3">
                  <p className="text-xs font-medium">Login demo sekali klik</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <Button
                        key={acc.email}
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!demoLoading || loading}
                        onClick={() => handleDemoLogin(acc.email)}
                      >
                        {demoLoading === acc.email && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        {acc.label}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Klik peran untuk langsung masuk (kata sandi: {DEMO_PASSWORD}).
                  </p>
                </div>

              </form>

            </TabsContent>

            <TabsContent value="daftar">
              <form onSubmit={handleRegister} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nama Lengkap</Label>
                  <Input id="reg-name" name="full_name" required maxLength={100} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reg-identifier">NIS / NIP</Label>
                    <Input id="reg-identifier" name="identifier" maxLength={30} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-class">Kelas</Label>
                    <Input id="reg-class" name="class_name" maxLength={30} placeholder="XII TKJ 1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" name="email" type="email" required maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Kata Sandi</Label>
                  <Input
                    id="reg-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    maxLength={72}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Buat Akun Siswa
                </Button>
                <p className="text-xs text-muted-foreground">
                  Akun baru otomatis berperan sebagai siswa. Peran guru/admin diberikan oleh
                  administrator sekolah.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
