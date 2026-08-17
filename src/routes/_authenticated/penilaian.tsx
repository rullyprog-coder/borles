import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, ExternalLink, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/penilaian")({
  head: () => ({
    meta: [
      { title: "Penilaian Manual — SMK Borneo Lestari" },
      {
        name: "description",
        content:
          "Daftar jawaban esai dan unggahan yang menunggu penilaian guru, lengkap dengan formulir nilai cepat.",
      },
      { property: "og:title", content: "Penilaian Manual Guru" },
      {
        property: "og:description",
        content: "Nilai jawaban esai dan berkas siswa dengan cepat dalam satu layar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GradingPage,
});

type PendingRow = {
  answerId: string;
  attemptId: string;
  examId: string;
  examTitle: string;
  studentName: string;
  studentClass: string;
  nomor: number;
  content: string;
  type: string;
  points: number;
  textAnswer: string | null;
  fileUrl: string | null;
  fileName: string | null;
  score: number | null;
  feedback: string | null;
};

function GradingPage() {
  const { isStaff, loading, profile, role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [showGraded, setShowGraded] = useState(false);

  const pending = useQuery({
    queryKey: ["pending-grading", showGraded],
    enabled: isStaff,
    queryFn: async (): Promise<PendingRow[]> => {
      const { data: questions, error: qError } = await supabase
        .from("questions")
        .select("id, exam_id, content, type, points, order_index")
        .in("type", ["essay", "file"])
        .order("order_index");
      if (qError) throw qError;
      const manual = questions ?? [];
      if (manual.length === 0) return [];

      const { data: answers, error: aError } = await supabase
        .from("answers")
        .select("id, attempt_id, question_id, text_answer, file_url, file_name, score, feedback")
        .in(
          "question_id",
          manual.map((q) => q.id),
        );
      if (aError) throw aError;
      const rows = (answers ?? []).filter((a) =>
        showGraded ? true : a.score === null || a.score === undefined,
      );
      if (rows.length === 0) return [];

      const attemptIds = [...new Set(rows.map((a) => a.attempt_id))];
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("id, exam_id, student_id, status")
        .in("id", attemptIds);
      const attemptById = new Map((attempts ?? []).map((a) => [a.id, a]));

      const examIds = [...new Set((attempts ?? []).map((a) => a.exam_id))];
      const { data: exams } = examIds.length
        ? await supabase.from("exams").select("id, title").in("id", examIds)
        : { data: [] };
      const examById = new Map((exams ?? []).map((e) => [e.id, e]));

      const studentIds = [...new Set((attempts ?? []).map((a) => a.student_id))];
      const { data: people } = studentIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, class_name")
            .in("id", studentIds)
        : { data: [] };
      const personById = new Map((people ?? []).map((p) => [p.id, p]));

      const questionById = new Map(manual.map((q) => [q.id, q]));

      return rows
        .map((answer) => {
          const attempt = attemptById.get(answer.attempt_id);
          const question = questionById.get(answer.question_id);
          if (!attempt || !question) return null;
          if (attempt.status === "in_progress") return null;
          const person = personById.get(attempt.student_id);
          return {
            answerId: answer.id,
            attemptId: attempt.id,
            examId: attempt.exam_id,
            examTitle: examById.get(attempt.exam_id)?.title ?? "Ujian",
            studentName: person?.full_name ?? "Siswa",
            studentClass: person?.class_name ?? "-",
            nomor: question.order_index,
            content: question.content,
            type: question.type,
            points: Number(question.points),
            textAnswer: answer.text_answer,
            fileUrl: answer.file_url,
            fileName: answer.file_name,
            score: answer.score === null ? null : Number(answer.score),
            feedback: answer.feedback,
          } satisfies PendingRow;
        })
        .filter((row): row is PendingRow => row !== null)
        .sort((a, b) => a.examTitle.localeCompare(b.examTitle) || a.nomor - b.nomor);
    },
  });

  const rows = useMemo(() => pending.data ?? [], [pending.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.examTitle.toLowerCase().includes(q) ||
        r.studentClass.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { examId: string; examTitle: string; items: PendingRow[] }>();
    for (const row of filtered) {
      const bucket = map.get(row.examId) ?? {
        examId: row.examId,
        examTitle: row.examTitle,
        items: [],
      };
      bucket.items.push(row);
      map.set(row.examId, bucket);
    }
    return [...map.values()];
  }, [filtered]);

  const saveScore = useMutation({
    mutationFn: async (input: {
      row: PendingRow;
      score: number;
      feedback: string;
    }) => {
      const { error } = await supabase
        .from("answers")
        .update({ score: input.score, feedback: input.feedback || null })
        .eq("id", input.row.answerId);
      if (error) throw error;
      const { error: rpcError } = await supabase.rpc("recalc_manual_score", {
        _attempt_id: input.row.attemptId,
      });
      if (rpcError) throw rpcError;
      await logAudit({
        action: "grade_updated",
        entityType: "answer",
        entityId: input.row.answerId,
        entityLabel: `${input.row.studentName} — soal ${input.row.nomor}`,
        details: {
          exam: input.row.examTitle,
          score: input.score,
          max: input.row.points,
          feedback: input.feedback || null,
        },
        actorName: profile?.full_name ?? null,
        actorRole: role ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Nilai tersimpan");
      queryClient.invalidateQueries({ queryKey: ["pending-grading"] });
      queryClient.invalidateQueries({ queryKey: ["attempts"] });
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
        title="Penilaian Manual"
        description="Semua jawaban esai dan berkas unggahan yang menunggu nilai Anda, dikelompokkan per ujian."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-56 pl-9"
                placeholder="Cari siswa atau ujian"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                maxLength={60}
              />
            </div>
            <Button
              variant={showGraded ? "default" : "outline"}
              onClick={() => setShowGraded((v) => !v)}
            >
              {showGraded ? "Tampilkan yang belum dinilai" : "Tampilkan semua"}
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Butir menunggu nilai", value: rows.filter((r) => r.score === null).length },
          { label: "Ujian terdampak", value: new Set(rows.map((r) => r.examId)).size },
          { label: "Siswa terdampak", value: new Set(rows.map((r) => r.studentName)).size },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {pending.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat daftar penilaian…
        </div>
      )}

      {pending.isSuccess && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <CheckCircle2 className="mx-auto size-8 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Tidak ada jawaban yang menunggu penilaian. Kerja bagus!
          </p>
        </div>
      )}

      <div className="space-y-6">
        {grouped.map((group) => (
          <section key={group.examId} className="rounded-xl border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="size-5 text-primary" />
                <div>
                  <h2 className="font-display text-lg font-bold">{group.examTitle}</h2>
                  <p className="text-xs text-muted-foreground">
                    {group.items.length} butir untuk dinilai
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/exams/$examId/hasil" params={{ examId: group.examId }}>
                  Lihat hasil ujian <ExternalLink className="ml-2 size-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-3 pt-4">
              {group.items.map((row) => (
                <div key={row.answerId} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {row.nomor}. {row.content}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.studentName} • {row.studentClass}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{row.type === "file" ? "Unggahan" : "Esai"}</Badge>
                      <Badge variant={row.score === null ? "outline" : "default"}>
                        {row.score === null ? "Belum dinilai" : `${row.score}/${row.points}`}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3">
                    {row.type === "file" ? (
                      row.fileUrl ? (
                        <Button variant="outline" size="sm" onClick={() => openFile(row.fileUrl!)}>
                          Buka berkas: {row.fileName ?? "jawaban"}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">Tidak ada berkas.</p>
                      )
                    ) : (
                      <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                        {row.textAnswer?.trim() || (
                          <span className="text-muted-foreground">Tidak dijawab.</span>
                        )}
                      </div>
                    )}
                  </div>

                  <form
                    className="mt-3 grid gap-2 sm:grid-cols-[110px_1fr_auto]"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      const score = Number(form.get("score"));
                      if (Number.isNaN(score) || score < 0 || score > row.points) {
                        toast.error(`Nilai harus 0–${row.points}`);
                        return;
                      }
                      setSaving(row.answerId);
                      saveScore.mutate(
                        { row, score, feedback: String(form.get("feedback") ?? "") },
                        { onSettled: () => setSaving(null) },
                      );
                    }}
                  >
                    <Input
                      name="score"
                      type="number"
                      step="0.5"
                      min={0}
                      max={row.points}
                      defaultValue={row.score ?? ""}
                      placeholder={`0–${row.points}`}
                      aria-label="Nilai"
                    />
                    <Textarea
                      name="feedback"
                      rows={1}
                      maxLength={500}
                      placeholder="Catatan untuk siswa"
                      defaultValue={row.feedback ?? ""}
                    />
                    <Button type="submit" size="sm" disabled={saving === row.answerId}>
                      {saving === row.answerId && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Simpan
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
