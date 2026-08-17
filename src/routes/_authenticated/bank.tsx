import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Library, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  BrowserBreadcrumb,
  ClassGrid,
  SubjectGrid,
  useClasses,
  useSubjects,
} from "@/components/ClassSubjectBrowser";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { buildQuestionTemplateDocx, downloadBlob } from "@/lib/docx-template";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/bank")({
  head: () => ({
    meta: [
      { title: "Bank Soal — SMK Borneo Lestari" },
      { name: "description", content: "Simpan dan gunakan kembali soal untuk ujian berikutnya." },
      { property: "og:title", content: "Bank Soal — SMK Borneo Lestari" },
      { property: "og:description", content: "Simpan dan gunakan kembali soal ujian." },
    ],
  }),
  component: BankPage,
});

type Option = { id: string; text: string };

function parseOptions(value: unknown): Option[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((o): o is Option => !!o && typeof o === "object" && "id" in o && "text" in o)
    .map((o) => ({ id: String(o.id), text: String(o.text) }));
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

type ParsedRow = {
  content: string;
  options: Option[];
  correct: string;
  points: number;
};

function rowFromCells(cols: string[], index: number): ParsedRow {
  const content = (cols[0] ?? "").trim();
  if (content.length < 3) throw new Error(`Baris ${index + 1}: pertanyaan terlalu pendek`);
  const options = ["a", "b", "c", "d", "e"]
    .map((id, i) => ({ id, text: (cols[i + 1] ?? "").trim() }))
    .filter((o) => o.text.length > 0);
  if (options.length < 2) throw new Error(`Baris ${index + 1}: minimal 2 opsi jawaban`);
  const correct = (cols[6] ?? "").trim().toLowerCase();
  if (!options.some((o) => o.id === correct))
    throw new Error(`Baris ${index + 1}: kunci jawaban tidak valid`);
  const points = Number(cols[7]) > 0 ? Number(cols[7]) : 10;
  return { content, options, correct, points };
}

function isHeader(cols: string[]) {
  const first = (cols[0] ?? "").toLowerCase();
  return first.includes("pertanyaan") || first.includes("soal");
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error("Berkas kosong");
  const all = lines.map(parseCsvLine);
  const rows = isHeader(all[0]!) ? all.slice(1) : all;
  if (rows.length === 0) throw new Error("Tidak ada baris soal");
  return rows.map(rowFromCells);
}

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

function stripMarker(line: string) {
  return line
    .replace(/^\d+\s*[.)]\s*/, "")
    .replace(/^[a-j]\s*[.)]\s*/i, "")
    .trim();
}

// Tolerant terhadap dokumen Word yang memakai penomoran otomatis
// (penanda "1." / "a." hilang saat dikonversi).
function parseNumberedLines(lines: string[]): ParsedRow[] {
  const rows: ParsedRow[] = [];
  let buffer: string[] = [];

  for (const line of lines) {
    const answer = line.match(/^jawaban\s*[:.]?\s*([a-j])\b/i);
    if (!answer) {
      const text = stripMarker(line);
      if (text.length > 0) buffer.push(text);
      continue;
    }

    const [questionText, ...optionTexts] = buffer;
    buffer = [];
    if (!questionText) throw new Error("Ada 'Jawaban' tanpa pertanyaan sebelumnya");
    if (questionText.length < 3) throw new Error(`Soal "${questionText}" terlalu pendek`);
    if (optionTexts.length < 2) throw new Error(`Soal "${questionText}": minimal 2 opsi jawaban`);
    if (optionTexts.length > LETTERS.length)
      throw new Error(`Soal "${questionText}": terlalu banyak opsi jawaban`);

    const options = optionTexts.map((text, i) => ({ id: LETTERS[i]!, text }));
    const correct = answer[1]!.toLowerCase();
    if (!options.some((o) => o.id === correct))
      throw new Error(`Soal "${questionText}": kunci jawaban tidak valid`);

    rows.push({ content: questionText, options, correct, points: 10 });
  }

  if (rows.length === 0) throw new Error("Tidak ada soal yang dikenali di dokumen");
  return rows;
}


async function parseDocx(file: File): Promise<ParsedRow[]> {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const converter = mammoth.default ?? mammoth;
  const { value: html } = await converter.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const doc = new DOMParser().parseFromString(html, "text/html");
  const trs = Array.from(doc.querySelectorAll("tr"));
  let cells: string[][];
  if (trs.length > 0) {
    cells = trs.map((tr) =>
      Array.from(tr.querySelectorAll("td,th")).map((td) => (td.textContent ?? "").trim()),
    );
  } else {
    const lines = Array.from(doc.querySelectorAll("p,li"))
      .map((p) => (p.textContent ?? "").trim())
      .filter((line) => line.length > 0);
    if (lines.some((line) => /^jawaban\s*[:.]?\s*[a-j]\b/i.test(line))) {
      return parseNumberedLines(lines);
    }
    cells = lines.map(parseCsvLine);
  }
  if (cells.length === 0) throw new Error("Dokumen Word kosong");
  const rows = isHeader(cells[0]!) ? cells.slice(1) : cells;
  if (rows.length === 0) throw new Error("Tidak ada baris soal");
  return rows.map(rowFromCells);
}

const CSV_TEMPLATE =
  "pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,opsi_e,kunci,poin\n" +
  '"Ibu kota Indonesia?",Jakarta,Bandung,Surabaya,Medan,Semarang,a,10\n';

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, "template-import-soal.csv");
}

const TEMPLATE_QUESTIONS = [
  {
    content: "Dimana rumah budi",
    options: ["Banjarbaru", "Martaura", "Banjarmasin", "Pelaihari", "Kotabaru"],
    correct: "a",
  },
  {
    content: "Berapa hasil dari 7 x 8?",
    options: ["54", "56", "58", "64", "72"],
    correct: "b",
  },
];

function downloadWordTemplate() {
  const blob = buildQuestionTemplateDocx(
    "Template Import Soal — SMK Borneo Lestari",
    TEMPLATE_QUESTIONS,
  );
  downloadBlob(blob, "template-import-soal.docx");
}


function BankPage() {
  const { userId, isStaff, loading } = useCurrentUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [previewFile, setPreviewFile] = useState<string>("");
  const [classId, setClassId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const ready = !!classId && !!subjectId;

  const classes = useClasses();
  const subjects = useSubjects(classId);
  const className = (classes.data ?? []).find((c) => c.id === classId)?.name ?? "";
  const subjectName = (subjects.data ?? []).find((s) => s.id === subjectId)?.name ?? "";

  const bank = useQuery({
    queryKey: ["question-bank", classId, subjectId],
    enabled: ready,
    queryFn: async () =>
      (
        await supabase
          .from("question_bank")
          .select("*, subjects(name), classes(name)")
          .eq("class_id", classId!)
          .eq("subject_id", subjectId!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const addItem = useMutation({
    mutationFn: async (form: FormData) => {
      const content = String(form.get("content") ?? "").trim();
      if (content.length < 3) throw new Error("Pertanyaan minimal 3 karakter");
      const rawOptions = ["a", "b", "c", "d", "e"]
        .map((id) => ({ id, text: String(form.get(`opt-${id}`) ?? "").trim() }))
        .filter((o) => o.text.length > 0);
      const correct = String(form.get("correct") ?? "")
        .trim()
        .toLowerCase();
      if (rawOptions.length < 2) throw new Error("Minimal 2 opsi jawaban");
      if (!rawOptions.some((o) => o.id === correct)) throw new Error("Kunci jawaban tidak valid");
      const { error } = await supabase.from("question_bank").insert({
        owner_id: userId!,
        content,
        type: "single",
        points: Number(form.get("points")) || 10,
        options: rawOptions,
        correct_answers: [correct],
        subject_id: subjectId,
        class_id: classId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Soal disimpan ke bank soal");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["question-bank"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("question_bank").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Soal dihapus");
      queryClient.invalidateQueries({ queryKey: ["question-bank"] });
    },
    onError: (error: Error) => toast.error("Gagal menghapus: " + error.message),
  });

  const importItems = useMutation({
    mutationFn: async (rows: ParsedRow[]) => {
      const { error } = await supabase.from("question_bank").insert(
        rows.map((row) => ({
          owner_id: userId!,
          content: row.content,
          type: "single",
          points: row.points,
          options: row.options,
          correct_answers: [row.correct],
          subject_id: subjectId,
          class_id: classId,
        })),
      );
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} soal berhasil diimpor`);
      setImportOpen(false);
      setPreview(null);
      setPreviewFile("");
      queryClient.invalidateQueries({ queryKey: ["question-bank"] });
    },
    onError: (error: Error) => toast.error("Gagal impor: " + error.message),
  });

  if (!loading && !isStaff) {
    return (
      <AppShell>
        <PageHeader title="Akses ditolak" description="Halaman ini khusus guru dan admin." />
      </AppShell>
    );
  }

  const items = bank.data ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Bank Soal"
        description="Masuk ke kelas, pilih mata pelajaran, lalu kelola soal yang bisa dipakai ulang."
        actions={
          ready ? (
            <div className="flex flex-wrap gap-2">
            <Dialog
              open={importOpen}
              onOpenChange={(next) => {
                setImportOpen(next);
                if (!next) {
                  setPreview(null);
                  setPreviewFile("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 size-4" /> Import Soal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Soal dari CSV / Word</DialogTitle>
                  <DialogDescription>
                    Kelas {className} • {subjectName}. Kolom: pertanyaan, opsi_a, opsi_b, opsi_c,
                    opsi_d, opsi_e, kunci (a/b/c/d/e), poin. Untuk Word (.docx) gunakan format bernomor:
                    "1. Pertanyaan", opsi "a." sampai "e.", lalu "Jawaban: A".
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="secondary" onClick={downloadTemplate}>
                      <Download className="mr-2 size-4" /> Template CSV
                    </Button>
                    <Button variant="secondary" onClick={downloadWordTemplate}>
                      <Download className="mr-2 size-4" /> Template Word
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="csv-file">Berkas CSV atau Word</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv,.docx,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={importItems.isPending}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        try {
                          const rows = file.name.toLowerCase().endsWith(".docx")
                            ? await parseDocx(file)
                            : parseCsv(await file.text());
                          setPreview(rows);
                          setPreviewFile(file.name);
                        } catch (error) {
                          setPreview(null);
                          setPreviewFile("");
                          toast.error("Gagal membaca berkas: " + (error as Error).message);
                        }
                      }}
                    />
                  </div>
                  {preview && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Pratinjau {preview.length} soal dari {previewFile}. Periksa dulu sebelum
                        menyimpan.
                      </p>
                      <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border p-3">
                        {preview.map((row, index) => (
                          <div key={index} className="rounded-md bg-muted/40 p-3">
                            <p className="text-sm font-medium">
                              {index + 1}. {row.content}
                            </p>
                            <ul className="mt-1 space-y-0.5 text-sm">
                              {row.options.map((option) => (
                                <li
                                  key={option.id}
                                  className={
                                    option.id === row.correct
                                      ? "font-medium text-primary"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {option.id.toUpperCase()}. {option.text}
                                </li>
                              ))}
                            </ul>
                            <Badge variant="secondary" className="mt-2">
                              {row.points} poin
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setPreview(null);
                            setPreviewFile("");
                          }}
                          disabled={importItems.isPending}
                        >
                          Batal
                        </Button>
                        <Button
                          className="flex-1"
                          disabled={importItems.isPending}
                          onClick={() => importItems.mutate(preview)}
                        >
                          {importItems.isPending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          )}
                          Simpan {preview.length} Soal
                        </Button>
                      </div>
                    </div>
                  )}
                  {importItems.isPending && (
                    <p className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin" /> Mengimpor soal...
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" /> Soal Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tambah Soal ke Bank</DialogTitle>
                  <DialogDescription>
                    Kelas {className} • {subjectName} — pilihan ganda satu kunci jawaban.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addItem.mutate(new FormData(event.currentTarget));
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="content">Pertanyaan</Label>
                    <Textarea id="content" name="content" rows={3} maxLength={2000} required />
                  </div>
                  {["a", "b", "c", "d", "e"].map((id) => (
                    <div key={id} className="space-y-2">
                      <Label htmlFor={`opt-${id}`}>Opsi {id.toUpperCase()}</Label>
                      <Input id={`opt-${id}`} name={`opt-${id}`} maxLength={500} />
                    </div>
                  ))}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="correct">Kunci</Label>
                      <Select name="correct" defaultValue="a">
                        <SelectTrigger id="correct">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["a", "b", "c", "d", "e"].map((id) => (
                            <SelectItem key={id} value={id}>
                              {id.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="points">Poin</Label>
                      <Input
                        id="points"
                        name="points"
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={10}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={addItem.isPending}>
                    {addItem.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Simpan
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          ) : null
        }
      />

      <BrowserBreadcrumb
        rootLabel="Semua Kelas"
        className={classId ? className : undefined}
        subjectName={ready ? subjectName : undefined}
        onRoot={() => {
          setClassId(null);
          setSubjectId(null);
        }}
        onClass={() => setSubjectId(null)}
      />

      {!classId && <ClassGrid onSelect={(id) => setClassId(id)} />}
      {classId && !subjectId && <SubjectGrid classId={classId} onSelect={(id) => setSubjectId(id)} />}

      <div className="grid gap-3">
        {ready &&
          items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.content}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{item.points} poin</Badge>
                    {item.classes?.name && <Badge variant="outline">{item.classes.name}</Badge>}
                    {item.subjects?.name && <Badge variant="outline">{item.subjects.name}</Badge>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm("Hapus soal dari bank?")) removeItem.mutate(item.id);
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {parseOptions(item.options).map((option) => (
                  <li
                    key={option.id}
                    className={
                      item.correct_answers.includes(option.id)
                        ? "font-medium text-primary"
                        : "text-muted-foreground"
                    }
                  >
                    {option.id.toUpperCase()}. {option.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        {ready && bank.isSuccess && items.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            <Library className="mx-auto mb-2 size-6" />
            Bank soal untuk {className} — {subjectName} masih kosong.
          </div>
        )}
      </div>
    </AppShell>
  );
}
