import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, GraduationCap, ShieldCheck, Users } from "lucide-react";
import heroImage from "@/assets/hero-smk.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ujian Online SMK Borneo Lestari Banjarbaru" },
      {
        name: "description",
        content:
          "Platform ujian online resmi SMK Borneo Lestari Banjarbaru. Guru membuat ujian, siswa mengerjakan dengan aman, hasil langsung terekap.",
      },
      { property: "og:title", content: "Ujian Online SMK Borneo Lestari" },
      {
        property: "og:description",
        content:
          "Sekolah Akreditasi A dengan motto ASIK: Agamis, Santun, Inovatif, Kompetetif. Ujian berbasis komputer yang aman dan modern.",
      },
    ],
  }),
  component: Landing,
});

const asik = [
  { letter: "A", title: "Agamis", text: "Menanamkan nilai keimanan dan akhlak mulia." },
  { letter: "S", title: "Santun", text: "Membentuk karakter sopan dalam bertutur dan bersikap." },
  { letter: "I", title: "Inovatif", text: "Mendorong kreativitas dan pemanfaatan teknologi." },
  { letter: "K", title: "Kompetetif", text: "Menyiapkan lulusan siap bersaing di dunia kerja." },
];


function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl gradient-hero">
              <GraduationCap className="size-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-tight">SMK Borneo Lestari</p>
              <p className="text-xs text-muted-foreground">Banjarbaru • Akreditasi A</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <a
                href="https://smk-borneolestari.sch.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                Website SMK Borneo Lestari
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "daftar" }}>
                Daftar
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="gradient-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div className="text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
              Motto ASIK • Akreditasi A
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Ujian Online <span className="text-gradient-gold">SMK Borneo Lestari</span>
            </h1>
            <p className="mt-4 max-w-xl text-primary-foreground/85">
              Satu platform untuk guru menyusun ujian, siswa mengerjakan secara aman, dan sekolah
              memantau hasil secara real-time.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">Masuk ke Portal</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/auth" search={{ mode: "daftar" }}>
                  Daftar Akun Siswa
                </Link>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-lift ring-1 ring-primary-foreground/20">
            <img
              src={heroImage}
              alt="Siswa SMK Borneo Lestari berfoto bersama saat pembelajaran di luar kelas"
              width={1280}
              height={960}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>


      <section className="border-y bg-secondary/50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Profil Sekolah</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                SMK Borneo Lestari adalah sekolah menengah kejuruan berakreditasi A di Banjarbaru,
                Kalimantan Selatan. Sekolah berkomitmen mencetak lulusan yang siap kerja dan
                berkarakter melalui motto <strong>ASIK</strong>.
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Admin, Guru, dan Siswa
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  Data terlindungi per peran
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {asik.map((item) => (
                <div key={item.letter} className="rounded-xl border bg-card p-5 shadow-soft">
                  <div className="grid size-9 place-items-center rounded-lg gradient-gold font-display text-base font-bold text-gold-foreground">
                    {item.letter}
                  </div>
                  <h3 className="mt-3 font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-sidebar py-8 text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm">
          <p>© {new Date().getFullYear()} SMK Borneo Lestari — Banjarbaru, Kalimantan Selatan</p>
          <p className="text-sidebar-foreground/70">Agamis • Santun • Inovatif • Kompetetif</p>
        </div>
      </footer>
    </div>
  );
}
