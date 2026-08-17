import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock, History, Loader2, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { ALLOWED_UPLOAD_TYPES, sanitizeFileName, validateFile } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


export const Route = createFileRoute("/_authenticated/ujian/$examId")({
  head: () => ({
    meta: [
      { title: "Mengerjakan Ujian — SMK Borneo Lestari" },
      { name: "description", content: "Antarmuka ujian online dengan timer dan autosave jawaban." },
      { property: "og:title", content: "Mengerjakan Ujian" },
      { property: "og:description", content: "Ujian online dengan timer dan autosave jawaban." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AttemptPage,
});

type Option = { id: string; text: string };

/** Draf lokal jawaban esai agar ketikan tetap ada setelah refresh. */
function draftKey(examId: string) {
  return `ujian-draft-${examId}`;
}

function readDrafts(examId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(draftKey(examId));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeDrafts(examId: string, drafts: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(examId), JSON.stringify(drafts));
  } catch {
    // penyimpanan penuh atau diblokir — abaikan
  }
}

function parseOptions(value: unknown): Option[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((o, index): Option | null => {
      if (typeof o === "string") return { id: o, text: o };
      if (o && typeof o === "object") {
        const rec = o as Record<string, unknown>;
        const text = rec['text'] ?? rec['label'] ?? rec['value'];
        if (text === undefined || text === null) return null;
        return { id: String(rec['id'] ?? index), text: String(text) };
      }
      return null;
    })
    .filter((o): o is Option => !!o && o.text.trim().length > 0);
}


function AttemptPage() {
  const { examId } = Route.useParams();
  const { userId } = useCurrentUser();
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [files, setFiles] = useState<Record<string, string>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});

  const [violations, setViolations] = useState(0);
  const [leaveCount, setLeaveCount] = useState(0);
  const [locked, setLocked] = useState(false);
  const tokenRef = useRef<string>("");
  const textTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});


  const [resumed, setResumed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const exam = useQuery({
    queryKey: ["exam-public", examId],
    queryFn: async () =>
      (await supabase.from("exams").select("id, title, duration_minutes").eq("id", examId).maybeSingle())
        .data,
  });

  const questions = useQuery({
    queryKey: ["exam-questions", examId],
    enabled: !!attemptId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_exam_questions", { _exam_id: examId });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Start or resume the attempt
  useEffect(() => {
    if (!userId || attemptId) return;
    let active = true;
    (async () => {
      const token = crypto.randomUUID();
      tokenRef.current = token;

      const { data, error } = await supabase.rpc("start_attempt", {
        _exam_id: examId,
        _session_token: token,
      });
      if (!active) return;
      if (error || !data) {
        toast.error("Tidak dapat memulai ujian: " + (error?.message ?? "tidak diketahui"));
        navigate({ to: "/ujian" });
        return;
      }
      const attempt = Array.isArray(data) ? data[0] : data;
      if (!attempt) return;
      if (attempt.status !== "in_progress") {
        toast.info("Ujian ini sudah Anda kumpulkan.");
        navigate({ to: "/ujian" });
        return;
      }
      setAttemptId(attempt.id);
      setViolations(attempt.tab_switches ?? 0);
      setLeaveCount(attempt.leave_attempts ?? 0);
      const minutes = exam.data?.duration_minutes ?? 60;
      setDeadline(new Date(attempt.started_at).getTime() + minutes * 60_000);

      const { data: existing } = await supabase
        .from("answers")
        .select("question_id, selected, file_name, text_answer")
        .eq("attempt_id", attempt.id);
      const nextSelections: Record<string, string[]> = {};
      const nextFiles: Record<string, string> = {};
      const nextTexts: Record<string, string> = {};
      for (const row of existing ?? []) {
        nextSelections[row.question_id] = row.selected ?? [];
        if (row.file_name) nextFiles[row.question_id] = row.file_name;
        if (row.text_answer) nextTexts[row.question_id] = row.text_answer;
      }
      const drafts = readDrafts(examId);
      for (const [questionId, value] of Object.entries(drafts)) {
        if (value && value.trim().length > (nextTexts[questionId]?.length ?? 0)) {
          nextTexts[questionId] = value;
        }
      }

      setSelections(nextSelections);
      setFiles(nextFiles);
      setTexts(nextTexts);

      const answeredBefore =
        Object.values(nextSelections).some((v) => v.length > 0) ||
        Object.keys(nextFiles).length > 0 ||
        Object.values(nextTexts).some((v) => v.trim().length > 0);
      if (answeredBefore) {
        setResumed(true);
        toast.info("Ujian dilanjutkan — jawaban dan sisa waktu Anda dipulihkan.");
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, examId, attemptId, exam.data?.duration_minutes, navigate]);

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (!attemptId || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      const { error } = await supabase.rpc("submit_attempt", { _attempt_id: attemptId });
      setSubmitting(false);
      if (error) {
        submittedRef.current = false;
        toast.error("Gagal mengumpulkan: " + error.message);
        return;
      }
      writeDrafts(examId, {});
      toast.success(auto ? "Waktu habis — jawaban dikumpulkan otomatis" : "Ujian berhasil dikumpulkan");
      navigate({ to: "/ujian" });
    },
    [attemptId, navigate, examId],
  );

  // Timer
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) void handleSubmit(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, handleSubmit]);

  // Cegah akses bersamaan: pantau session_token milik percobaan ini
  useEffect(() => {
    if (!attemptId || locked) return;
    const check = async () => {
      const { data } = await supabase
        .from("exam_attempts")
        .select("session_token, status")
        .eq("id", attemptId)
        .maybeSingle();
      if (!data) return;
      if (data.status !== "in_progress") {
        submittedRef.current = true;
        navigate({ to: "/ujian" });
        return;
      }
      if (data.session_token && data.session_token !== tokenRef.current) {
        setLocked(true);
        submittedRef.current = true;
        toast.error("Ujian dibuka di perangkat lain. Sesi ini dihentikan.");
      }
    };
    void check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, [attemptId, locked, navigate]);


  // Anti-cheat: catat pelanggaran ke server
  const logViolation = useCallback(
    async (kind: "tab" | "leave") => {
      if (!attemptId) return;
      const { data } = await supabase.rpc("log_attempt_violation", {
        _attempt_id: attemptId,
        _kind: kind,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setViolations(row.tab_switches ?? 0);
        setLeaveCount(row.leave_attempts ?? 0);
      }
    },
    [attemptId],
  );

  // Anti-cheat: deteksi pindah tab + blokir salin/tempel & menu konteks
  useEffect(() => {
    if (!attemptId) return;
    const onVisibility = () => {
      if (document.hidden) {
        void logViolation("tab");
        toast.warning("Terdeteksi berpindah tab. Aktivitas ini dicatat.");
      }
    };
    const block = (event: Event) => event.preventDefault();
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
    };
  }, [attemptId, logViolation]);

  // Anti-cheat: cegah refresh / menutup / meninggalkan halaman ujian
  useEffect(() => {
    if (!attemptId || submittedRef.current) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      void logViolation("leave");
      event.preventDefault();
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [attemptId, logViolation]);

  // Anti-cheat: cegah navigasi mundur ke luar halaman ujian
  useEffect(() => {
    if (!attemptId) return;
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      if (submittedRef.current) return;
      window.history.pushState(null, "", window.location.href);
      void logViolation("leave");
      toast.warning("Anda tidak dapat meninggalkan halaman ujian sebelum mengumpulkan.");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [attemptId, logViolation]);


  async function saveAnswer(questionId: string, selected: string[]) {
    if (!attemptId) return;
    setSelections((prev) => ({ ...prev, [questionId]: selected }));
    const { error } = await supabase
      .from("answers")
      .upsert(
        { attempt_id: attemptId, question_id: questionId, selected },
        { onConflict: "attempt_id,question_id" },
      );
    if (error) toast.error("Gagal menyimpan jawaban: " + error.message);
  }

  async function saveTextAnswer(questionId: string, value: string) {
    if (!attemptId) return;
    const { error } = await supabase.from("answers").upsert(
      { attempt_id: attemptId, question_id: questionId, selected: [], text_answer: value },
      { onConflict: "attempt_id,question_id" },
    );
    if (error) toast.error("Gagal menyimpan jawaban: " + error.message);
  }

  /** Simpan jawaban esai ke database ~800ms setelah berhenti mengetik. */
  function queueTextSave(questionId: string, value: string) {
    const timers = textTimersRef.current;
    if (timers[questionId]) clearTimeout(timers[questionId]);
    timers[questionId] = setTimeout(() => {
      void saveTextAnswer(questionId, value);
    }, 800);
  }




  async function uploadAnswerFile(questionId: string, file: File) {
    if (!attemptId) return;
    const problem = validateFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    const path = `${attemptId}/${questionId}-${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage.from("exam-uploads").upload(path, file);
    if (error) {
      toast.error("Gagal mengunggah: " + error.message);
      return;
    }
    const { error: dbError } = await supabase.from("answers").upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        selected: [],
        file_url: path,
        file_name: file.name,
      },
      { onConflict: "attempt_id,question_id" },
    );
    if (dbError) {
      toast.error("Gagal menyimpan berkas: " + dbError.message);
      return;
    }
    setFiles((prev) => ({ ...prev, [questionId]: file.name }));
    toast.success("Berkas terunggah");
  }

  const list = questions.data ?? [];
  const answeredCount = useMemo(
    () =>
      list.filter(
        (q) =>
          (selections[q.id]?.length ?? 0) > 0 ||
          !!files[q.id] ||
          (texts[q.id]?.trim().length ?? 0) > 0,
      ).length,
    [list, selections, files, texts],
  );

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const lowTime = remaining > 0 && remaining <= 300;

  if (locked) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center shadow-soft">
          <AlertTriangle className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 font-display text-xl font-bold">Sesi ujian dihentikan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ujian ini sedang dibuka pada perangkat atau tab lain. Untuk menjaga integritas ujian,
            hanya satu sesi aktif yang diperbolehkan.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/ujian" })}>
            Kembali ke Daftar Ujian
          </Button>
        </div>
      </AppShell>
    );
  }


  return (
    <AppShell>
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b bg-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold">{exam.data?.title ?? "Ujian"}</h1>
            <p className="text-xs text-muted-foreground">
              Terjawab {answeredCount} dari {list.length} soal
            </p>
          </div>
          <div className="flex items-center gap-3">
            {violations > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" /> {violations}x pindah tab
              </Badge>
            )}
            {leaveCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" /> {leaveCount}x coba keluar
              </Badge>
            )}
            <Badge variant={lowTime ? "destructive" : "secondary"} className="gap-1 text-base">
              <Clock className="size-4" />
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </Badge>
            <Button
              onClick={() => {
                if (confirm("Kumpulkan jawaban sekarang? Anda tidak dapat mengubahnya lagi."))
                  void handleSubmit(false);
              }}
              disabled={submitting || !attemptId}
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Kumpulkan
            </Button>
          </div>
        </div>
        <Progress
          className="mt-3 h-1.5"
          value={list.length ? (answeredCount / list.length) * 100 : 0}
        />
      </div>

      {resumed && attemptId && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <History className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Melanjutkan ujian sebelumnya</p>
            <p className="text-xs text-muted-foreground">
              {answeredCount} dari {list.length} soal sudah tersimpan. Timer tetap berjalan sejak
              Anda memulai ujian — sisa waktu {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}.
            </p>
          </div>
        </div>
      )}

      {!attemptId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Menyiapkan ujian...
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        <div className="space-y-4 select-none">
        {list.map((question, index) => {
          const options = parseOptions(question.options);
          const selected = selections[question.id] ?? [];
          return (
            <div
              key={question.id}
              id={`soal-${index + 1}`}
              className="scroll-mt-32 rounded-xl border bg-card p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  {index + 1}. {question.content}
                </p>
                <Badge variant="secondary">
                  {Math.round(Number(question.points) * 100) / 100} poin
                </Badge>
              </div>

              {question.type === "file" ? (
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`file-${question.id}`} className="text-sm text-muted-foreground">
                    Unggah jawaban (PDF/gambar/dokumen, maks 5MB)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Upload className="size-4 text-muted-foreground" />
                    <Input
                      id={`file-${question.id}`}
                      type="file"
                      accept={ALLOWED_UPLOAD_TYPES.join(",")}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadAnswerFile(question.id, file);
                      }}
                    />
                  </div>
                  {files[question.id] && (
                    <p className="text-xs text-primary">Terunggah: {files[question.id]}</p>
                  )}
                </div>
              ) : question.type === "essay" ? (
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`essay-${question.id}`} className="text-sm text-muted-foreground">
                    Tulis jawaban Anda (dinilai manual oleh guru)
                  </Label>
                  <Textarea
                    id={`essay-${question.id}`}
                    rows={6}
                    value={texts[question.id] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTexts((prev) => {
                        const next = { ...prev, [question.id]: value };
                        writeDrafts(examId, next);
                        return next;
                      });
                      queueTextSave(question.id, value);
                    }}
                    onBlur={(event) => void saveTextAnswer(question.id, event.target.value)}
                    placeholder="Ketik jawaban Anda di sini…"
                  />
                  <p className="text-xs text-muted-foreground">
                    Jawaban tersimpan otomatis ke database beberapa saat setelah Anda berhenti
                    mengetik, dan draf lokal dipulihkan jika halaman ter-refresh.
                  </p>

                </div>
              ) : question.type === "single" || question.type === "truefalse" ? (

                <RadioGroup
                  className="mt-4 space-y-2"
                  value={selected[0] ?? ""}
                  onValueChange={(value) => void saveAnswer(question.id, [value])}
                >
                  {options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                    >
                      <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                      <Label
                        htmlFor={`${question.id}-${option.id}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="mt-4 space-y-2">
                  {options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                    >
                      <Checkbox
                        id={`${question.id}-${option.id}`}
                        checked={selected.includes(option.id)}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...selected, option.id]
                            : selected.filter((s) => s !== option.id);
                          void saveAnswer(question.id, next);
                        }}
                      />
                      <Label
                        htmlFor={`${question.id}-${option.id}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        </div>

        <aside className="order-first lg:order-none lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-xl border bg-card p-4 shadow-soft">
            <h2 className="font-display text-sm font-semibold">Palet Soal</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Hijau = sudah dijawab, abu-abu = belum.
            </p>
            <div className="mt-3 grid grid-cols-6 gap-2 lg:grid-cols-5">
              {list.map((question, index) => {
                const done =
                  (selections[question.id]?.length ?? 0) > 0 ||
                  !!files[question.id] ||
                  (texts[question.id]?.trim().length ?? 0) > 0;

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(`soal-${index + 1}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                    className={`grid aspect-square place-items-center rounded-md border text-sm font-medium transition-colors ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:bg-accent"
                    }`}
                    aria-label={`Soal ${index + 1}${done ? " sudah dijawab" : " belum dijawab"}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {answeredCount}/{list.length} soal terjawab
            </p>
          </div>
        </aside>
      </div>

    </AppShell>
  );
}
