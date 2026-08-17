import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BookOpenCheck, ClipboardList, Trophy, Users } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, roleLabel } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ujian Online SMK Borneo Lestari" },
      { name: "description", content: "Ringkasan ujian, peserta, dan performa nilai." },
      { property: "og:title", content: "Dashboard Ujian Online" },
      { property: "og:description", content: "Ringkasan ujian, peserta, dan performa nilai." },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="grid size-9 place-items-center rounded-lg bg-accent">
          <Icon className="size-4 text-accent-foreground" />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DashboardPage() {
  const { profile, role, isStaff, userId } = useCurrentUser();

  const staffData = useQuery({
    queryKey: ["dashboard-staff", userId],
    enabled: isStaff,
    queryFn: async () => {
      const [exams, attempts, students] = await Promise.all([
        supabase.from("exams").select("id, title, is_published").order("created_at", { ascending: false }),
        supabase.from("exam_attempts").select("id, exam_id, auto_score, manual_score, max_score, status"),
        supabase.from("user_roles").select("user_id").eq("role", "siswa"),
      ]);
      return {
        exams: exams.data ?? [],
        attempts: attempts.data ?? [],
        studentCount: (students.data ?? []).length,
      };
    },
  });

  const studentData = useQuery({
    queryKey: ["dashboard-student", userId],
    enabled: !!userId && !isStaff,
    queryFn: async () => {
      const [exams, attempts] = await Promise.all([
        supabase.from("exams").select("id, title").eq("is_published", true),
        supabase
          .from("exam_attempts")
          .select("id, exam_id, auto_score, manual_score, max_score, status")
          .eq("student_id", userId!),
      ]);
      return { exams: exams.data ?? [], attempts: attempts.data ?? [] };
    },
  });

  const chartData = (staffData.data?.exams ?? []).slice(0, 6).map((exam) => {
    const rows = (staffData.data?.attempts ?? []).filter((a) => a.exam_id === exam.id);
    const avg =
      rows.length === 0
        ? 0
        : Math.round(
            rows.reduce((sum, a) => {
              const max = Number(a.max_score) || 0;
              const got = Number(a.auto_score) + Number(a.manual_score);
              return sum + (max > 0 ? (got / max) * 100 : 0);
            }, 0) / rows.length,
          );
    return { name: exam.title.slice(0, 14), rata: avg };
  });

  const myScores = (studentData.data?.attempts ?? []).filter((a) => a.status !== "in_progress");
  const myAverage =
    myScores.length === 0
      ? 0
      : Math.round(
          myScores.reduce((sum, a) => {
            const max = Number(a.max_score) || 0;
            const got = Number(a.auto_score) + Number(a.manual_score);
            return sum + (max > 0 ? (got / max) * 100 : 0);
          }, 0) / myScores.length,
        );

  return (
    <AppShell>
      <PageHeader
        title={`Halo, ${profile?.full_name || "Pengguna"}`}
        description="Ringkasan aktivitas ujian di SMK Borneo Lestari."
        actions={<Badge variant="secondary">{roleLabel(role)}</Badge>}
      />

      {isStaff ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={ClipboardList}
              label="Total Ujian"
              value={staffData.data?.exams.length ?? 0}
              hint={`${(staffData.data?.exams ?? []).filter((e) => e.is_published).length} diterbitkan`}
            />
            <StatCard
              icon={BookOpenCheck}
              label="Percobaan Ujian"
              value={staffData.data?.attempts.length ?? 0}
            />
            <StatCard
              icon={Trophy}
              label="Menunggu Dinilai"
              value={(staffData.data?.attempts ?? []).filter((a) => a.status === "submitted").length}
            />
            <StatCard icon={Users} label="Siswa Terdaftar" value={staffData.data?.studentCount ?? 0} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">Rata-rata Nilai per Ujian</h2>
              <p className="text-sm text-muted-foreground">Dalam skala 0–100.</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <ReTooltip />
                    <Bar dataKey="rata" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">Ujian Terbaru</h2>
              <ul className="mt-4 space-y-2">
                {(staffData.data?.exams ?? []).slice(0, 6).map((exam) => (
                  <li key={exam.id}>
                    <Link
                      to="/exams/$examId"
                      params={{ examId: exam.id }}
                      className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="truncate">{exam.title}</span>
                      <Badge variant={exam.is_published ? "default" : "secondary"}>
                        {exam.is_published ? "Terbit" : "Draf"}
                      </Badge>
                    </Link>
                  </li>
                ))}
                {(staffData.data?.exams ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada ujian.</p>
                )}
              </ul>
              <Button asChild className="mt-4 w-full">
                <Link to="/exams">Kelola Ujian</Link>
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={ClipboardList}
              label="Ujian Tersedia"
              value={studentData.data?.exams.length ?? 0}
            />
            <StatCard icon={BookOpenCheck} label="Ujian Selesai" value={myScores.length} />
            <StatCard icon={Trophy} label="Rata-rata Nilai" value={myAverage} hint="skala 0–100" />
          </div>
          <div className="mt-6 rounded-xl border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Siap mengerjakan ujian?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lihat daftar ujian aktif dan riwayat hasil ujian Anda.
            </p>
            <Button asChild className="mt-4">
              <Link to="/ujian">Buka Daftar Ujian</Link>
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}
