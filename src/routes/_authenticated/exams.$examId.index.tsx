import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, GripVertical, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BrowserBreadcrumb } from "@/components/ClassSubjectBrowser";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { ALLOWED_IMAGE_TYPES, sanitizeFileName, validateFile } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/exams/$examId/")({
  head: () => ({
    meta: [
      { title: "Editor Soal Ujian — SMK Borneo Lestari" },
      { name: "description", content: "Susun soal pilihan ganda dan unggah berkas untuk ujian." },
      { property: "og:title", content: "Editor Soal Ujian" },
      { property: "og:description", content: "Susun soal pilihan ganda dan unggah berkas." },
    ],
  }),
  component: ExamEditorPage,
});

type Option = { id: string; text: string };
type QuestionType = "single" | "multiple" | "truefalse" | "essay" | "file";

const TYPE_LABEL: Record<QuestionType, string> = {
  single: "PG Tunggal",
  multiple: "PG Jamak",
  truefalse: "Benar / Salah",
  essay: "Essay",
  file: "Unggah Berkas",
};

const TYPE_OPTIONS: { value: QuestionType; description: string }[] = [
  { value: "single", description: "Siswa memilih satu jawaban benar dari beberapa opsi." },
  { value: "multiple", description: "Siswa bisa memilih lebih dari satu jawaban benar." },
  { value: "truefalse", description: "Pernyataan dengan kunci Benar atau Salah." },
  { value: "essay", description: "Jawaban teks bebas, dinilai manual oleh guru." },
  { value: "file", description: "Siswa mengunggah berkas jawaban, dinilai manual." },
];

const TRUE_FALSE_OPTIONS: Option[] = [
  { id: "benar", text: "Benar" },
  { id: "salah", text: "Salah" },
];


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


function ExamEditorPage() {
  const { examId } = Route.useParams();
  const { isStaff, loading } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [type, setType] = useState<QuestionType | null>(null);
  const [content, setContent] = useState("");
  const [options, setOptions] = useState<Option[]>([
    { id: "a", text: "" },
    { id: "b", text: "" },
    { id: "c", text: "" },
    { id: "d", text: "" },
    { id: "e", text: "" },
  ]);
  const [correct, setCorrect] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const exam = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () =>
      (
        await supabase
          .from("exams")
          .select("*, subjects(name), classes(name), meetings(title)")
          .eq("id", examId)
          .maybeSingle()
      ).data,
  });

  const questions = useQuery({
    queryKey: ["questions", examId],
    queryFn: async () =>
      (
        await supabase
          .from("questions")
          .select("*")
          .eq("exam_id", examId)
          .order("order_index", { ascending: true })
      ).data ?? [],
  });

  async function redistributePoints() {
    const { data } = await supabase
      .from("questions")
      .select("id")
      .eq("exam_id", examId)
      .order("order_index", { ascending: true });
    const rows = data ?? [];
    if (rows.length === 0) return;
    const base = Math.floor(100 / rows.length);
    const remainder = 100 - base * rows.length;
    await Promise.all(
      rows.map((row, index) =>
        supabase
          .from("questions")
          .update({ points: base + (index < remainder ? 1 : 0) })
          .eq("id", row.id),
      ),
    );
  }

  const removeQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
      await redistributePoints();
    },
    onSuccess: () => {
      toast.success("Soal dihapus");
      queryClient.invalidateQueries({ queryKey: ["questions", examId] });
    },
    onError: (error: Error) => toast.error("Gagal menghapus: " + error.message),
  });

  function resetForm() {
    setContent("");

    setOptions([
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
      { id: "d", text: "" },
    ]);
    setCorrect([]);
    setImageFile(null);
  }

  async function handleAddQuestion(event: React.FormEvent) {
    event.preventDefault();
    if (!type) {
      toast.error("Pilih tipe soal terlebih dahulu");
      return;
    }
    if (content.trim().length < 3) {
      toast.error("Pertanyaan minimal 3 karakter");
      return;
    }
    const hasOptions = type === "single" || type === "multiple" || type === "truefalse";
    const activeOptions = type === "truefalse" ? TRUE_FALSE_OPTIONS : options;
    if (hasOptions) {
      const filled = activeOptions.filter((o) => o.text.trim().length > 0);
      if (filled.length < 2) {
        toast.error("Minimal 2 opsi jawaban");
        return;
      }
      if (correct.length === 0) {
        toast.error("Tentukan kunci jawaban");
        return;
      }
    }

    setSaving(true);
    let imageUrl: string | null = null;
    if (imageFile) {
      const problem = validateFile(imageFile, ALLOWED_IMAGE_TYPES);
      if (problem) {
        setSaving(false);
        toast.error(problem);
        return;
      }
      const path = `${examId}/${Date.now()}-${sanitizeFileName(imageFile.name)}`;
      const { error } = await supabase.storage.from("question-images").upload(path, imageFile);
      if (error) {
        setSaving(false);
        toast.error("Gagal mengunggah gambar: " + error.message);
        return;
      }
      imageUrl = path;
    }

    const filled = activeOptions.filter((o) => o.text.trim().length > 0);
    const { error } = await supabase.from("questions").insert({
      exam_id: examId,
      content: content.trim(),
      type,
      points: 1,
      options: hasOptions ? filled : [],
      correct_answers: hasOptions ? correct.filter((c) => filled.some((o) => o.id === c)) : [],
      order_index: (questions.data?.length ?? 0) + 1,
      image_url: imageUrl,
    });

    if (error) {
      setSaving(false);
      toast.error("Gagal menyimpan soal: " + error.message);
      return;
    }
    await redistributePoints();
    setSaving(false);
    toast.success("Soal ditambahkan");
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["questions", examId] });
  }

  if (!loading && !isStaff) {
    return (
      <AppShell>
        <PageHeader title="Akses ditolak" description="Halaman ini khusus guru dan admin." />
      </AppShell>
    );
  }

  const totalPoints = (questions.data ?? []).reduce((sum, q) => sum + Number(q.points), 0);

  return (
    <AppShell>
      <BrowserBreadcrumb
        rootLabel="Semua Kelas"
        className={exam.data?.classes?.name ?? undefined}
        subjectName={exam.data?.subjects?.name ?? undefined}
        meetingName={exam.data?.meetings?.title ?? undefined}
        onRoot={() => navigate({ to: "/exams" })}
        onClass={() => navigate({ to: "/exams" })}
        onSubject={() => navigate({ to: "/exams" })}
      />
      <PageHeader
        title={exam.data?.title ?? "Editor Soal"}
        description={`${questions.data?.length ?? 0} soal • total ${totalPoints} poin`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/exams">
                <ArrowLeft className="mr-2 size-4" /> Kembali
              </Link>
            </Button>
            <Button asChild>
              <Link to="/exams/$examId/hasil" params={{ examId }}>
                Lihat Hasil
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {!type ? (
          <div className="rounded-xl border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Pilih Tipe Soal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tentukan dulu jenis soal yang ingin dibuat. Form akan menyesuaikan tipe yang dipilih.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setType(option.value);
                    setCorrect([]);
                  }}
                  className="rounded-xl border p-4 text-left transition hover:border-primary hover:bg-accent"
                >
                  <p className="font-medium">{TYPE_LABEL[option.value]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
        <form onSubmit={handleAddQuestion} className="rounded-xl border bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Tambah Soal</h2>
              <p className="text-sm text-muted-foreground">Tipe: {TYPE_LABEL[type]}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setType(null);
                resetForm();
              }}
            >
              Ganti Tipe
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Poin dibagi otomatis oleh sistem sehingga total seluruh soal = 100.
            </p>


            <div className="space-y-2">
              <Label htmlFor="content">Pertanyaan</Label>
              <Textarea
                id="content"
                rows={3}
                maxLength={2000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Gambar Soal (opsional, maks 5MB)</Label>
              <div className="flex items-center gap-2">
                <ImagePlus className="size-4 text-muted-foreground" />
                <Input
                  id="image"
                  type="file"
                  accept={ALLOWED_IMAGE_TYPES.join(",")}
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {type === "truefalse" && (
              <div className="space-y-3">
                <Label>Kunci Jawaban</Label>
                <div className="flex gap-2">
                  {TRUE_FALSE_OPTIONS.map((option) => (
                    <Button
                      key={option.id}
                      type="button"
                      variant={correct[0] === option.id ? "default" : "outline"}
                      onClick={() => setCorrect([option.id])}
                    >
                      {option.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {type === "essay" && (
              <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                Siswa menjawab dalam bentuk teks bebas. Nilai diberikan manual di halaman Hasil.
              </p>
            )}

            {(type === "single" || type === "multiple") && (

              <div className="space-y-3">
                <Label>Opsi Jawaban & Kunci</Label>
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={correct.includes(option.id)}
                      onCheckedChange={(checked) => {
                        if (type === "single") {
                          setCorrect(checked ? [option.id] : []);
                        } else {
                          setCorrect((prev) =>
                            checked ? [...prev, option.id] : prev.filter((c) => c !== option.id),
                          );
                        }
                      }}
                      aria-label={`Kunci opsi ${option.id.toUpperCase()}`}
                    />
                    <span className="w-5 text-sm font-semibold uppercase text-muted-foreground">
                      {option.id}
                    </span>
                    <Input
                      value={option.text}
                      maxLength={500}
                      placeholder={`Opsi ${index + 1}`}
                      onChange={(event) =>
                        setOptions((prev) =>
                          prev.map((o) =>
                            o.id === option.id ? { ...o, text: event.target.value } : o,
                          ),
                        )
                      }
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setOptions((prev) => prev.filter((o) => o.id !== option.id));
                          setCorrect((prev) => prev.filter((c) => c !== option.id));
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOptions((prev) => [
                        ...prev,
                        { id: "abcdef"[prev.length] ?? `o${prev.length}`, text: "" },
                      ])
                    }
                  >
                    <Plus className="mr-2 size-4" /> Tambah Opsi
                  </Button>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Simpan Soal
            </Button>
          </div>
        </form>
        )}


        <div className="space-y-3">
          {(questions.data ?? []).map((question, index) => {
            const opts = parseOptions(question.options);
            return (
              <div key={question.id} className="rounded-xl border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <GripVertical className="mt-1 size-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {index + 1}. {question.content}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {TYPE_LABEL[question.type as QuestionType] ?? question.type}
                        </Badge>

                        <Badge variant="secondary">{question.points} poin</Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Hapus soal ini?")) removeQuestion.mutate(question.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                {opts.length > 0 && (
                  <ul className="mt-3 space-y-1 pl-7 text-sm">
                    {opts.map((option) => (
                      <li
                        key={option.id}
                        className={
                          question.correct_answers.includes(option.id)
                            ? "font-medium text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        {option.id.toUpperCase()}. {option.text}
                        {question.correct_answers.includes(option.id) && " ✓"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {questions.isSuccess && (questions.data ?? []).length === 0 && (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Belum ada soal untuk ujian ini.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
