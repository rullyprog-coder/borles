import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Clock, PlayCircle } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SCORE_POLICY_LABEL, attemptScale, pickCountedAttempt } from "@/lib/analytics";
import type { ScorePolicy } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/ujian/")({
  head: () => ({
    meta: [
      { title: "Daftar Ujian Saya — SMK Borneo Lestari" },
      { name: "description", content: "Ujian aktif dan riwayat nilai siswa SMK Borneo Lestari." },
      { property: "og:title", content: "Daftar Ujian Saya" },
      { property: "og:description", content: "Ujian aktif dan riwayat nilai siswa." },
    ],
  }),
  component: StudentExamsPage,
});

function StudentExamsPage() {
  const { userId } = useCurrentUser();

  const exams = useQuery({
    queryKey: ["published-exams"],
    queryFn: async () =>
      (
        await supabase
          .from("exams")
          .select("*, subjects(name)")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const attempts = useQuery({
    queryKey: ["my-attempts", userId],
    enabled: !!userId,
    queryFn: async () =>
      (await supabase.from("exam_attempts").select("*").eq("student_id", userId!)).data ?? [],
  });

  const now = Date.now();

  return (
    <AppShell>
      <PageHeader
        title="Daftar Ujian"
        description="Kerjakan ujian yang tersedia dan lihat hasil ujian Anda."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {(exams.data ?? []).map((exam) => {
          const examAttempts = (attempts.data ?? []).filter((a) => a.exam_id === exam.id);
          const running = examAttempts.find((a) => a.status === "in_progress");
          const limit = exam.max_attempts ?? 1;
          const policy = (exam.score_policy ?? "highest") as ScorePolicy;
          const used = examAttempts.length;
          const canRetake = used < limit;
          const counted = pickCountedAttempt(examAttempts, policy);
          const notStarted = exam.start_at ? new Date(exam.start_at).getTime() > now : false;
          const ended = exam.end_at ? new Date(exam.end_at).getTime() < now : false;
          const nilai = counted ? attemptScale(counted) : 0;

          return (
            <div key={exam.id} className="rounded-xl border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-semibold">{exam.title}</h2>
                {exam.subjects?.name && <Badge variant="outline">{exam.subjects.name}</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {exam.description || "Tanpa deskripsi"}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {exam.duration_minutes} menit
                </span>
                {exam.start_at && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="size-3.5" />
                    {new Date(exam.start_at).toLocaleString("id-ID")}
                  </span>
                )}
                <span>
                  Percobaan {used}/{limit} • {SCORE_POLICY_LABEL[policy]}
                </span>
              </div>

              <div className="mt-4">
                {counted && !running && (
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-accent px-4 py-3">
                    <span className="text-sm text-accent-foreground">
                      {counted.status === "graded" ? "Sudah dinilai" : "Menunggu penilaian"} •{" "}
                      {SCORE_POLICY_LABEL[policy]}
                    </span>
                    <span className="font-display text-xl font-bold">{nilai}</span>
                  </div>
                )}
                {notStarted ? (
                  <Button disabled className="w-full">
                    Belum dibuka
                  </Button>
                ) : ended ? (
                  <Button disabled className="w-full">
                    Sudah ditutup
                  </Button>
                ) : running || canRetake ? (
                  <Button asChild className="w-full">
                    <Link to="/ujian/$examId" params={{ examId: exam.id }}>
                      <PlayCircle className="mr-2 size-4" />
                      {running
                        ? "Lanjutkan Ujian"
                        : used > 0
                          ? `Ulangi Ujian (sisa ${limit - used}x)`
                          : "Mulai Ujian"}
                    </Link>
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    Batas pengerjaan tercapai
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {exams.isSuccess && (exams.data ?? []).length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Belum ada ujian yang diterbitkan.
        </div>
      )}
    </AppShell>
  );
}
