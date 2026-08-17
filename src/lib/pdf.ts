import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfSummaryRow = {
  nama: string;
  identifier: string;
  kelas: string;
  status: string;
  nilai: number;
  maksimal: number;
  skala100: number;
  benar: number;
  totalSoal: number;
  persenBenar: number;
  tabSwitches: number;
};

export type PdfQuestionStat = {
  nomor: number;
  ringkas: string;
  tipe: string;
  poin: number;
  rataSkor: number;
  persenBenar: number;
};

export type PdfEssayEntry = {
  siswa: string;
  nomor: number;
  soal: string;
  jawaban: string;
  berkas?: string | undefined;
  skor: string;
  catatan?: string | undefined;
};

export type PdfReport = {
  examTitle: string;
  subtitle?: string;
  summary: PdfSummaryRow[];
  questionStats: PdfQuestionStat[];
  essays: PdfEssayEntry[];
  stats: {
    peserta: number;
    rataRata: number;
    tertinggi: number;
    terendah: number;
    selesai: number;
  };
};

const NAVY: [number, number, number] = [23, 43, 77];
const GOLD: [number, number, number] = [201, 162, 39];

const num = (v: number) => (Math.round(Number(v) * 10) / 10).toString();

function clip(text: string, max: number) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

export function downloadResultsPdf(report: PdfReport, filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Kop laporan
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 74, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 74, pageWidth, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("SMK BORNEO LESTARI BANJARBARU", 40, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Laporan Hasil Ujian Online", 40, 50);
  doc.setFontSize(8);
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, pageWidth - 40, 50, { align: "right" });

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(clip(report.examTitle, 80), 40, 104);
  if (report.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(clip(report.subtitle, 110), 40, 119);
  }

  // Ringkasan statistik
  autoTable(doc, {
    startY: 132,
    head: [["Peserta", "Sudah Mengumpulkan", "Rata-rata", "Tertinggi", "Terendah"]],
    body: [
      [
        String(report.stats.peserta),
        String(report.stats.selesai),
        report.stats.rataRata.toFixed(1),
        String(report.stats.tertinggi),
        String(report.stats.terendah),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9, halign: "center", cellPadding: 5 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
  });

  // Tabel nilai siswa
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("Ringkasan Nilai Peserta", 40, y);

  autoTable(doc, {
    startY: y + 8,
    head: [["No", "Nama", "NIS", "Kelas", "Status", "Nilai", "Skala 100", "Benar", "% Benar", "Tab"]],
    body: report.summary.map((row, index) => [
      index + 1,
      clip(row.nama, 28),
      row.identifier,
      row.kelas,
      row.status,
      `${num(row.nilai)}/${num(row.maksimal)}`,
      row.skala100,
      `${row.benar}/${row.totalSoal}`,
      `${row.persenBenar}%`,
      row.tabSwitches,
    ]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      5: { halign: "center" },
      6: { halign: "center" },
      7: { halign: "center" },
      8: { halign: "center" },
      9: { halign: "center" },
    },
  });

  // Analisis butir soal
  if (report.questionStats.length > 0) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Analisis Butir Soal", 40, 50);
    autoTable(doc, {
      startY: 58,
      head: [["No", "Soal", "Tipe", "Poin", "Rata-rata Skor", "% Benar"]],
      body: report.questionStats.map((q) => [
        q.nomor,
        clip(q.ringkas, 70),
        q.tipe,
        num(q.poin),
        q.rataSkor.toFixed(1),
        `${q.persenBenar}%`,
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 24, halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
      },
    });
  }

  // Daftar jawaban esai & berkas unggahan
  if (report.essays.length > 0) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Jawaban Esai & Berkas Unggahan", 40, 50);
    autoTable(doc, {
      startY: 58,
      head: [["Siswa", "No", "Soal", "Jawaban / Berkas", "Skor", "Catatan"]],
      body: report.essays.map((e) => [
        clip(e.siswa, 22),
        e.nomor,
        clip(e.soal, 45),
        e.berkas ? `[Berkas] ${clip(e.berkas, 40)}` : clip(e.jawaban || "(tidak dijawab)", 320),
        typeof e.skor === "number" ? num(e.skor) : e.skor,
        clip(e.catatan ?? "-", 40),
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: NAVY, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 22, halign: "center" },
        2: { cellWidth: 110 },
        4: { cellWidth: 42, halign: "center" },
        5: { cellWidth: 80 },
      },
    });
  }

  // Nomor halaman
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Halaman ${i} dari ${total}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 24,
      { align: "right" },
    );
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export type StudentReportQuestion = {
  nomor: number;
  soal: string;
  tipe: string;
  poin: number;
  skor: number;
  benar: boolean;
  jawaban: string;
  kunci?: string | undefined;
  catatan?: string | undefined;
};

export type StudentReport = {
  examTitle: string;
  subtitle?: string;
  nama: string;
  identifier: string;
  kelas: string;
  status: string;
  nilai: number;
  maksimal: number;
  skala100: number;
  benar: number;
  totalSoal: number;
  persenBenar: number;
  rataKelas: number;
  mulai: string;
  selesai: string;
  tabSwitches: number;
  leaveAttempts: number;
  questions: StudentReportQuestion[];
};

/** Laporan PDF untuk satu siswa (rapor hasil ujian individual). */
export function downloadStudentPdf(report: StudentReport, filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 74, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 74, pageWidth, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("SMK BORNEO LESTARI BANJARBARU", 40, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Rapor Hasil Ujian Siswa", 40, 50);
  doc.setFontSize(8);
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, pageWidth - 40, 50, { align: "right" });

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(clip(report.examTitle, 80), 40, 104);
  if (report.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(clip(report.subtitle, 110), 40, 119);
  }

  autoTable(doc, {
    startY: 132,
    head: [["Identitas", "Keterangan"]],
    body: [
      ["Nama", report.nama],
      ["NIS", report.identifier],
      ["Kelas", report.kelas],
      ["Status", report.status],
      ["Mulai", report.mulai],
      ["Selesai", report.selesai],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 110, fontStyle: "bold" } },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  autoTable(doc, {
    startY: y,
    head: [["Nilai", "Skala 100", "Benar", "% Benar", "Rata-rata Kelas", "Pindah Tab"]],
    body: [
      [
        `${num(report.nilai)}/${num(report.maksimal)}`,
        String(report.skala100),
        `${report.benar}/${report.totalSoal}`,
        `${report.persenBenar}%`,
        report.rataKelas.toFixed(1),
        `${report.tabSwitches}x`,
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9, halign: "center", cellPadding: 5 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("Rincian Jawaban", 40, y);

  autoTable(doc, {
    startY: y + 8,
    head: [["No", "Soal", "Tipe", "Jawaban Siswa", "Kunci", "Skor", "Catatan"]],
    body: report.questions.map((q) => [
      q.nomor,
      clip(q.soal, 90),
      q.tipe,
      clip(q.jawaban || "(tidak dijawab)", 200),
      clip(q.kunci ?? "-", 24),
      `${num(q.skor)}/${num(q.poin)}`,
      clip(q.catatan ?? "-", 40),
    ]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 4, valign: "top", overflow: "linebreak" },
    headStyles: { fillColor: NAVY, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      1: { cellWidth: 130 },
      2: { cellWidth: 46, halign: "center" },
      4: { cellWidth: 54, halign: "center" },
      5: { cellWidth: 46, halign: "center" },
      6: { cellWidth: 74 },
    },
  });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Halaman ${i} dari ${total}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 24,
      { align: "right" },
    );
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
