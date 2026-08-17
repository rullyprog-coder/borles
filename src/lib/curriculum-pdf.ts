import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CATEGORY_LABEL, type SubjectDraft, type GradeConfig } from "@/lib/curriculum-config";

const NAVY: [number, number, number] = [23, 43, 77];

export type CurriculumPdfInput = {
  className: string;
  curriculumName: string;
  description?: string | null;
  schoolName?: string;
  academicYear?: string;
  config?: GradeConfig | null;
  subjects: SubjectDraft[];
};

/** Ekspor kurikulum satu kelas menjadi PDF beserta ringkasan jumlah mapel per kategori. */
export function exportCurriculumPdf(input: CurriculumPdfInput) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(input.schoolName || "SMK Borneo Lestari", 40, 30);
  doc.setFontSize(10);
  doc.text(
    `Kurikulum ${input.className} — Tahun Ajaran ${input.academicYear || "-"}`,
    40,
    50,
  );

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.text(input.curriculumName, 40, 100);

  const subjects = input.subjects.slice().sort((a, b) => a.order_index - b.order_index);
  const totalHours = subjects.reduce((sum, s) => sum + (s.hours || 0), 0);

  doc.setFontSize(10);
  const desc = (input.description || input.config?.description || "").trim();
  const lines = doc.splitTextToSize(desc || "-", width - 80) as string[];
  doc.text(lines, 40, 118);

  let cursor = 118 + lines.length * 13 + 10;
  doc.setFontSize(10);
  doc.text(
    `Jumlah mata pelajaran: ${subjects.length}${
      input.config ? ` (target ${input.config.totalSubjects})` : ""
    }   •   Total alokasi jam: ${totalHours} JP`,
    40,
    cursor,
  );
  cursor += 16;

  const perCategory = (["umum", "dasar", "klinis", "lanjutan"] as const)
    .map((c) => ({ label: CATEGORY_LABEL[c], count: subjects.filter((s) => s.category === c).length }))
    .filter((r) => r.count > 0);

  autoTable(doc, {
    startY: cursor,
    head: [["Kategori", "Jumlah Mapel"]],
    body: perCategory.map((r) => [r.label, String(r.count)]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    margin: { left: 40, right: 40 },
  });

  const afterSummary = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  autoTable(doc, {
    startY: (afterSummary?.finalY ?? cursor) + 20,
    head: [["No", "Mata Pelajaran", "Kode", "Kategori", "Jam (JP)"]],
    body: subjects.map((s, i) => [
      String(i + 1),
      s.name,
      s.code,
      CATEGORY_LABEL[s.category],
      String(s.hours),
    ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    margin: { left: 40, right: 40 },
  });

  const safe = `${input.className}-${input.curriculumName}`.replace(/[^\w-]+/g, "_");
  doc.save(`kurikulum-${safe}.pdf`);
}
