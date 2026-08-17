import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  Loader2,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { downloadCsv, downloadExcel } from "@/lib/export";
import { downloadResultsPdf, downloadStudentPdf, type PdfEssayEntry } from "@/lib/pdf";
import { logAudit } from "@/lib/audit";
import {
  attemptScale,
  attemptStats,
  attemptTotal,
  classAverage,
  questionStats,
  type AnalyticsQuestion,
} from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/exams/$examId/hasil")({
  head: () => ({
    meta: [
      { title: "Hasil & Analitik Ujian — SMK Borneo Lestari" },
      {
        name: "description",
        content: "Analitik nilai per siswa dan per soal, penilaian esai, serta ekspor PDF/Excel.",
      },
      { property: "og:title", content: "Hasil & Analitik Ujian" },
      {
        property: "og:description",
        content: "Analitik nilai per siswa dan per soal serta ekspor laporan PDF dan Excel.",
      },
    ],
  }),
  component: ResultsPage,
});

const STATUS_LABEL: Record<string, string> = {
  in_progress: "Sedang Mengerjakan",
  submitted: "Terkumpul",
  graded: "Dinilai",
};

function ResultsPage() {
  const { examId } = Route.useParams();
  const { isStaff, loading, profile, role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [grading, setGrading] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  const exam = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () =>
      (await supabase.from("exams").select("*").eq("id", examId).maybeSingle()).data,
  });

  const attempts = useQuery({
    queryKey: ["attempts", examId],
    // Pantau pelanggaran (pindah tab / keluar halaman) hampir real-time.
    refetchInterval: 10000,
    queryFn: async () => {

      const { data: rows } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("exam_id", examId)
        .order("started_at", { ascending: false });
      const list = rows ?? [];
      const ids = [...new Set(list.map((a) => a.student_id))];
      const { data: people } = ids.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, identifier, class_name")
            .in("id", ids)
        : { data: [] };
      const byId = new Map((people ?? []).map((p) => [p.id, p]));
      return list.map((a) => ({ ...a, student: byId.get(a.student_id) ?? null }));
    },
  });

  const questions = useQuery({
    queryKey: ["questions", examId],
    queryFn: async () =>
      (await supabase.from("questions").select("*").eq("exam_id", examId).order("order_index"))
        .data ?? [],
  });

  const answers = useQuery({
    queryKey: ["answers", examId],
    enabled: (attempts.data?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = (attempts.data ?? []).map((a) => a.id);
      const { data } = await supabase.from("answers").select("*").in("attempt_id", ids);
      return data ?? [];
    },
  });

  const attemptList = useMemo(() => attempts.data ?? [], [attempts.data]);
  const questionList = useMemo(
    () => (questions.data ?? []) as unknown as AnalyticsQuestion[],
    [questions.data],
  );
  const answerList = useMemo(() => answers.data ?? [], [answers.data]);

  // Siswa dengan pelanggaran pindah tab / keluar halaman, terbanyak di atas.
  const violationList = useMemo(
    () =>
      attemptList
        .filter((a) => (a.tab_switches ?? 0) > 0 || (a.leave_attempts ?? 0) > 0)
        .sort(
          (a, b) =>
            (b.tab_switches ?? 0) + (b.leave_attempts ?? 0) -
            ((a.tab_switches ?? 0) + (a.leave_attempts ?? 0)),
        ),
    [attemptList],
  );


  const avgClass = useMemo(() => classAverage(attemptList), [attemptList]);
  const perQuestion = useMemo(
    () =>
      questionStats(
        questionList,
        answerList,
        attemptList.map((a) => a.id),
      ),
    [questionList, answerList, attemptList],
  );

  const overall = useMemo(() => {
    const scales = attemptList
      .filter((a) => a.status !== "in_progress")
      .map((a) => attemptScale(a));
    return {
      peserta: attemptList.length,
      selesai: scales.length,
      rataRata: avgClass,
      tertinggi: scales.length ? Math.max(...scales) : 0,
      terendah: scales.length ? Math.min(...scales) : 0,
    };
  }, [attemptList, avgClass]);

  const filteredAttempts = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return attemptList;
    return attemptList.filter(
      (a) =>
        (a.student?.full_name ?? "").toLowerCase().includes(q) ||
        (a.student?.identifier ?? "").toLowerCase().includes(q) ||
        (a.student?.class_name ?? "").toLowerCase().includes(q),
    );
  }, [attemptList, studentSearch]);

  const selected = useMemo(
    () => attemptList.find((a) => a.id === selectedId) ?? null,
    [attemptList, selectedId],
  );

  const saveScore = useMutation({
    mutationFn: async ({
      answerId,
      attemptId,
      score,
      feedback,
      label,
      max,
    }: {
      answerId: string;
      attemptId: string;
      score: number;
      feedback: string;
      label: string;
      max: number;
    }) => {
      const { error } = await supabase
        .from("answers")
        .update({ score, feedback: feedback || null })
        .eq("id", answerId);
      if (error) throw error;
      const { error: rpcError } = await supabase.rpc("recalc_manual_score", {
        _attempt_id: attemptId,
      });
      if (rpcError) throw rpcError;
      await logAudit({
        action: "grade_updated",
        entityType: "answer",
        entityId: answerId,
        entityLabel: label,
        details: { exam: exam.data?.title ?? "Ujian", score, max, feedback: feedback || null },
        actorName: profile?.full_name ?? null,
        actorRole: role ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Nilai tersimpan");
      queryClient.invalidateQueries({ queryKey: ["answers", examId] });
      queryClient.invalidateQueries({ queryKey: ["attempts", examId] });
      queryClient.invalidateQueries({ queryKey: ["pending-grading"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (error: Error) => toast.error("Gagal menyimpan nilai: " + error.message),
  });

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from("exam-uploads").createSignedUrl(path, 300);
    if (error || !data) {
      toast.error("Gagal membuka berkas");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function buildRows() {
    return attemptList.map((a) => {
      const stats = attemptStats(a, questionList, answerList);
      return {
        Nama: a.student?.full_name ?? "-",
        NIS: a.student?.identifier ?? "-",
        Kelas: a.student?.class_name ?? "-",
        Status: STATUS_LABEL[a.status] ?? a.status,
        Nilai: attemptTotal(a),
        Maksimal: Number(a.max_score) || 0,
        Skala100: attemptScale(a),
        Benar: stats.correct,
        TotalSoal: stats.total,
        PersenBenar: stats.persenBenar,
        SelisihRataKelas: Math.round((attemptScale(a) - avgClass) * 10) / 10,
        PindahTab: a.tab_switches ?? 0,
        KeluarHalaman: a.leave_attempts ?? 0,
        Mulai: new Date(a.started_at).toLocaleString("id-ID"),
        Selesai: a.submitted_at ? new Date(a.submitted_at).toLocaleString("id-ID") : "-",
      };
    });
  }

  function guardEmpty() {
    if (attemptList.length === 0) {
      toast.error("Belum ada data untuk diekspor");
      return true;
    }
    return false;
  }

  function exportCsv() {
    if (guardEmpty()) return;
    downloadCsv(`hasil-${exam.data?.title ?? "ujian"}.csv`, buildRows());
  }

  function exportExcel() {
    if (guardEmpty()) return;
    downloadExcel(`hasil-${exam.data?.title ?? "ujian"}.xls`, buildRows(), "Hasil Ujian");
  }

  function exportPdf() {
    if (guardEmpty()) return;
    const essays: PdfEssayEntry[] = [];
    for (const attempt of attemptList) {
      const stats = attemptStats(attempt, questionList, answerList);
      for (const row of stats.perQuestion) {
        if (row.question.type !== "essay" && row.question.type !== "file") continue;
        essays.push({
          siswa: attempt.student?.full_name ?? "Siswa",
          nomor: row.nomor,
          soal: row.question.content,
          jawaban: row.answer?.text_answer ?? "",
          berkas: row.answer?.file_name ?? undefined,
          skor: `${row.answer?.score ?? 0}/${row.question.points}`,
          catatan: row.answer?.feedback ?? undefined,
        });
      }
    }

    downloadResultsPdf(
      {
        examTitle: exam.data?.title ?? "Ujian",
        subtitle: `Durasi ${exam.data?.duration_minutes ?? "-"} menit • ${attemptList.length} peserta • Rata-rata kelas ${avgClass.toFixed(1)}`,
        stats: overall,
        summary: attemptList.map((a) => {
          const stats = attemptStats(a, questionList, answerList);
          return {
            nama: a.student?.full_name ?? "-",
            identifier: a.student?.identifier ?? "-",
            kelas: a.student?.class_name ?? "-",
            status: STATUS_LABEL[a.status] ?? a.status,
            nilai: attemptTotal(a),
            maksimal: Number(a.max_score) || 0,
            skala100: attemptScale(a),
            benar: stats.correct,
            totalSoal: stats.total,
            persenBenar: stats.persenBenar,
            tabSwitches: a.tab_switches ?? 0,
          };
        }),
        questionStats: perQuestion.map((q) => ({
          nomor: q.nomor,
          ringkas: q.ringkas,
          tipe: q.tipe,
          poin: q.poin,
          rataSkor: q.rataSkor,
          persenBenar: q.persenBenar,
        })),
        essays,
      },
      `laporan-hasil-${(exam.data?.title ?? "ujian").toLowerCase().replace(/\s+/g, "-")}.pdf`,
    );
    toast.success("Laporan PDF diunduh");
  }

  function exportStudentPdf(attempt: (typeof attemptList)[number]) {
    const stats = attemptStats(attempt, questionList, answerList);
    downloadStudentPdf(
      {
        examTitle: exam.data?.title ?? "Ujian",
        subtitle: `Durasi ${exam.data?.duration_minutes ?? "-"} menit • Rata-rata kelas ${avgClass.toFixed(1)}`,
        nama: attempt.student?.full_name ?? "-",
        identifier: attempt.student?.identifier ?? "-",
        kelas: attempt.student?.class_name ?? "-",
        status: STATUS_LABEL[attempt.status] ?? attempt.status,
        nilai: attemptTotal(attempt),
        maksimal: Number(attempt.max_score) || 0,
        skala100: attemptScale(attempt),
        benar: stats.correct,
        totalSoal: stats.total,
        persenBenar: stats.persenBenar,
        rataKelas: avgClass,
        mulai: new Date(attempt.started_at).toLocaleString("id-ID"),
        selesai: attempt.submitted_at
          ? new Date(attempt.submitted_at).toLocaleString("id-ID")
          : "-",
        tabSwitches: attempt.tab_switches ?? 0,
        leaveAttempts: attempt.leave_attempts ?? 0,
        questions: stats.perQuestion.map((row) => ({
          nomor: row.nomor,
          soal: row.question.content,
          tipe: row.question.type,
          poin: Number(row.question.points),
          skor: Number(row.score ?? 0),
          benar: row.correct,
          jawaban:
            row.question.type === "file"
              ? row.answer?.file_name
                ? `[Berkas] ${row.answer.file_name}`
                : ""
              : row.question.type === "essay"
                ? (row.answer?.text_answer ?? "")
                : (row.answer?.selected ?? []).join(", ").toUpperCase(),
          kunci:
            row.question.type === "essay" || row.question.type === "file"
              ? "-"
              : row.question.correct_answers.join(", ").toUpperCase(),
          catatan: row.answer?.feedback ?? undefined,
        })),
      },
      `rapor-${(attempt.student?.full_name ?? "siswa").toLowerCase().replace(/\s+/g, "-")}-${(exam.data?.title ?? "ujian").toLowerCase().replace(/\s+/g, "-")}.pdf`,
    );
    toast.success("Rapor siswa diunduh");
  }

  if (!loading && !isStaff) {
    return (
      <AppShell>
        <PageHeader title="Akses ditolak" description="Halaman ini khusus guru dan admin." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={`Hasil: ${exam.data?.title ?? ""}`}
        description="Analitik nilai per siswa dan per butir soal, penilaian manual, serta ekspor laporan."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/exams">
                <ArrowLeft className="mr-2 size-4" /> Kembali
              </Link>
            </Button>

            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 size-4" /> CSV
            </Button>
            <Button variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="mr-2 size-4" /> Excel
            </Button>
            <Button onClick={exportPdf}>
              <FileText className="mr-2 size-4" /> Ekspor PDF
            </Button>
          </div>
        }
      />

      {selected && (
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Peserta", value: overall.peserta },
          { label: "Terkumpul", value: overall.selesai },
          { label: "Rata-rata kelas", value: overall.rataRata.toFixed(1) },
          { label: "Nilai tertinggi", value: overall.tertinggi },
          { label: "Nilai terendah", value: overall.terendah },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </section>
      )}

      {!selected && attemptList.length > 0 && (
        <section className="mb-8 rounded-xl border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold">Pengawasan Kecurangan</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Terdeteksi otomatis saat siswa pindah tab atau keluar dari halaman ujian.
                Diperbarui tiap 10 detik.
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <ShieldAlert className="size-3.5" />
              {violationList.length} siswa terdeteksi
            </Badge>
          </div>

          {violationList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada pelanggaran terdeteksi.
            </p>
          ) : (
            <ul className="mt-4 divide-y">
              {violationList.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {a.student?.full_name ?? "Siswa"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.student?.class_name ?? "-"} • {a.student?.identifier ?? "-"} •{" "}
                      {STATUS_LABEL[a.status] ?? a.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Pindah tab {a.tab_switches ?? 0}x</Badge>
                    <Badge variant="secondary">Keluar halaman {a.leave_attempts ?? 0}x</Badge>
                    <Button variant="outline" size="sm" onClick={() => setSelectedId(a.id)}>
                      Detail
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}


      {selected && perQuestion.length > 0 && attemptList.length > 0 && (
        <section className="mb-8 rounded-xl border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg font-bold">Analisis Butir Soal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Persentase peserta yang menjawab benar tiap soal.
          </p>
          <div className="mt-4 space-y-3">
            {perQuestion.map((q) => (
              <div key={q.id} className="grid gap-2 sm:grid-cols-[1fr_170px] sm:items-center">
                <p className="truncate text-sm">
                  <span className="font-medium">{q.nomor}.</span> {q.ringkas}
                </p>
                <div className="flex items-center gap-2">
                  <Progress value={q.persenBenar} className="h-2 flex-1" />
                  <span
                    className={`w-24 shrink-0 text-right text-xs ${q.persenBenar < 50 ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {q.persenBenar}% • {q.rataSkor.toFixed(1)}/{Number(q.poin).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!selected && attemptList.length > 0 && (
        <section className="rounded-xl border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Hasil per Siswa</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Klik nama siswa untuk melihat detail nilai, analisis butir soal, dan penilaian esai.
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-60 pl-9"
                placeholder="Cari nama, NIS, atau kelas"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                maxLength={60}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAttempts.map((attempt) => {
              return (
                <button
                  key={attempt.id}
                  type="button"
                  onClick={() => setSelectedId(attempt.id)}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-background p-4 text-left transition hover:border-primary hover:shadow-soft"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{attempt.student?.full_name ?? "Siswa"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {attempt.student?.class_name ?? "-"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>

          {filteredAttempts.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada siswa yang cocok dengan pencarian.
            </p>
          )}
        </section>
      )}

      {selected && (() => {
        const attempt = selected;
        const max = Number(attempt.max_score) || 0;
        const scale = attemptScale(attempt);
        const stats = attemptStats(attempt, questionList, answerList);
        const diff = Math.round((scale - avgClass) * 10) / 10;
        return (
          <section className="rounded-xl border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div className="flex items-start gap-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
                  <ArrowLeft className="mr-2 size-4" /> Daftar siswa
                </Button>
                <Button size="sm" onClick={() => exportStudentPdf(attempt)}>
                  <FileText className="mr-2 size-4" /> Rapor PDF siswa
                </Button>
                <div>
                  <p className="font-display text-lg font-bold">
                    {attempt.student?.full_name ?? "Siswa"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attempt.student?.class_name ?? "-"} • {attempt.student?.identifier ?? "-"} •{" "}
                    {stats.correct}/{stats.total} benar ({stats.persenBenar}%)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    attempt.status === "graded"
                      ? "default"
                      : attempt.status === "submitted"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {STATUS_LABEL[attempt.status] ?? attempt.status}
                </Badge>
                <span className="font-display text-2xl font-bold">{scale}</span>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 p-3 text-sm">
                <span>
                  Otomatis {Number(attempt.auto_score)} + Manual {Number(attempt.manual_score)} dari{" "}
                  {max} poin
                </span>
                <span className="inline-flex items-center gap-1">
                  {diff >= 0 ? (
                    <TrendingUp className="size-4 text-primary" />
                  ) : (
                    <TrendingDown className="size-4 text-destructive" />
                  )}
                  {diff >= 0 ? "+" : ""}
                  {diff} dibanding rata-rata kelas ({avgClass.toFixed(1)})
                </span>
                <span className="text-muted-foreground">
                  Pindah tab {attempt.tab_switches ?? 0}x • Keluar halaman{" "}
                  {attempt.leave_attempts ?? 0}x
                </span>
              </div>

              {stats.perQuestion.map((row) => {
                const question = row.question;
                const answer = row.answer;
                const classStat = perQuestion.find((q) => q.id === question.id);
                return (
                  <div key={question.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        {row.nomor}. {question.content}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant={row.correct ? "default" : "secondary"}>
                          {Number(row.score ?? 0).toFixed(1)}/{Number(question.points).toFixed(1)}{" "}
                          poin
                        </Badge>
                        {classStat && (
                          <span className="text-xs text-muted-foreground">
                            kelas {classStat.persenBenar}% benar
                          </span>
                        )}
                      </div>
                    </div>
                    {question.type === "file" || question.type === "essay" ? (
                      <div className="mt-3 space-y-3">
                        {question.type === "essay" ? (
                          <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                            {answer?.text_answer?.trim() || (
                              <span className="text-muted-foreground">Tidak dijawab.</span>
                            )}
                          </div>
                        ) : answer?.file_url ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openFile(answer.file_url!)}
                          >
                            Buka berkas: {answer.file_name ?? "jawaban"}
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">Tidak ada berkas.</p>
                        )}

                        {answer && (
                          <form
                            className="grid gap-2 sm:grid-cols-[110px_1fr_auto]"
                            onSubmit={(event) => {
                              event.preventDefault();
                              const form = new FormData(event.currentTarget);
                              const score = Number(form.get("score"));
                              if (Number.isNaN(score) || score < 0 || score > question.points) {
                                toast.error(`Nilai harus 0–${question.points}`);
                                return;
                              }
                              setGrading(answer.id);
                              saveScore.mutate(
                                {
                                  answerId: answer.id,
                                  attemptId: attempt.id,
                                  score,
                                  feedback: String(form.get("feedback") ?? ""),
                                  label: `${attempt.student?.full_name ?? "Siswa"} — soal ${row.nomor}`,
                                  max: Number(question.points),
                                },
                                { onSettled: () => setGrading(null) },
                              );
                            }}
                          >
                            <Input
                              name="score"
                              type="number"
                              min={0}
                              max={question.points}
                              defaultValue={answer.score ?? 0}
                              aria-label="Nilai"
                            />
                            <Textarea
                              name="feedback"
                              rows={1}
                              maxLength={500}
                              placeholder="Catatan untuk siswa"
                              defaultValue={answer.feedback ?? ""}
                            />
                            <Button type="submit" size="sm" disabled={grading === answer.id}>
                              {grading === answer.id && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              )}
                              Simpan
                            </Button>
                          </form>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Jawaban: {(answer?.selected ?? []).join(", ").toUpperCase() || "-"} • Kunci:{" "}
                        {question.correct_answers.join(", ").toUpperCase()} •{" "}
                        {row.correct ? "Benar" : "Salah"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {attempts.isSuccess && attemptList.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Belum ada siswa yang mengerjakan ujian ini.
        </div>
      )}
    </AppShell>
  );
}
