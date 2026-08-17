/** Konfigurasi & validasi kurikulum SMK Farmasi (kelas X, XI, XII). */

export type SubjectCategory = "umum" | "dasar" | "klinis" | "lanjutan";

export const CATEGORY_LABEL: Record<SubjectCategory, string> = {
  umum: "Umum",
  dasar: "Dasar Kejuruan",
  klinis: "Klinis & Komunitas",
  lanjutan: "Lanjutan / PKL",
};

export const CATEGORY_OPTIONS: SubjectCategory[] = ["umum", "dasar", "klinis", "lanjutan"];

export type GradeLevel = "X" | "XI" | "XII";

export type GradeConfig = {
  level: GradeLevel;
  title: string;
  description: string;
  totalSubjects: number;
  minByCategory: Partial<Record<SubjectCategory, number>>;
};

export const GRADE_CONFIG: Record<GradeLevel, GradeConfig> = {
  X: {
    level: "X",
    title: "Dasar-Dasar Teknologi Farmasi",
    description:
      "Kelas X menekankan mata pelajaran umum ditambah Dasar-Dasar Teknologi Farmasi sebagai fondasi kejuruan.",
    totalSubjects: 10,
    minByCategory: { umum: 8, dasar: 1 },
  },
  XI: {
    level: "XI",
    title: "Pendalaman Kompetensi Farmasi Klinis dan Komunitas",
    description:
      "Kelas XI memperdalam kompetensi Farmasi Klinis dan Komunitas, dilengkapi projek kreatif kewirausahaan dan PKL.",
    totalSubjects: 9,
    minByCategory: { umum: 6, klinis: 1, lanjutan: 2 },
  },
  XII: {
    level: "XII",
    title: "Pendalaman Lanjutan, PKL, dan Persiapan Dunia Kerja",
    description:
      "Kelas XII berfokus pada pendalaman lanjutan, praktik kerja lapangan, dan persiapan dunia kerja.",
    totalSubjects: 8,
    minByCategory: { umum: 5, klinis: 1, lanjutan: 2 },
  },
};

/** Ambil tingkat kelas dari nama kelas, contoh "XII Farmasi 1" -> "XII". */
export function gradeFromClassName(name: string): GradeLevel | null {
  const token = (name || "").trim().toUpperCase().split(/\s+/)[0];
  if (token === "X") return "X";
  if (token === "XI") return "XI";
  if (token === "XII") return "XII";
  return null;
}

export type SubjectDraft = {
  id: string;
  name: string;
  code: string;
  category: SubjectCategory;
  hours: number;
  order_index: number;
};

export type ValidationIssue = { level: "error" | "warning"; message: string };

/** Validasi daftar mapel terhadap konfigurasi SMK Farmasi untuk tingkat kelas tertentu. */
export function validateSubjects(
  subjects: SubjectDraft[],
  grade: GradeLevel | null,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const names = new Map<string, number>();
  const codes = new Map<string, number>();
  for (const s of subjects) {
    if (!s.name.trim()) issues.push({ level: "error", message: "Ada mata pelajaran tanpa nama." });
    if (!s.code.trim())
      issues.push({ level: "error", message: `Kode wajib diisi untuk "${s.name || "(tanpa nama)"}".` });
    if (s.hours < 0 || s.hours > 40)
      issues.push({ level: "error", message: `Alokasi jam "${s.name}" harus antara 0–40.` });
    names.set(s.name.trim().toLowerCase(), (names.get(s.name.trim().toLowerCase()) ?? 0) + 1);
    codes.set(s.code.trim().toUpperCase(), (codes.get(s.code.trim().toUpperCase()) ?? 0) + 1);
  }
  for (const [key, count] of names) if (count > 1 && key) issues.push({ level: "error", message: `Nama mapel ganda: ${key}.` });
  for (const [key, count] of codes) if (count > 1 && key) issues.push({ level: "error", message: `Kode mapel ganda: ${key}.` });

  if (!grade) {
    issues.push({
      level: "warning",
      message: "Tingkat kelas tidak dikenali (harus diawali X, XI, atau XII), validasi struktur dilewati.",
    });
    return issues;
  }

  const config = GRADE_CONFIG[grade];
  if (subjects.length !== config.totalSubjects) {
    issues.push({
      level: "error",
      message: `Kelas ${grade} harus memiliki tepat ${config.totalSubjects} mata pelajaran, saat ini ${subjects.length}.`,
    });
  }

  for (const category of CATEGORY_OPTIONS) {
    const min = config.minByCategory[category];
    if (!min) continue;
    const count = subjects.filter((s) => s.category === category).length;
    if (count < min) {
      issues.push({
        level: "error",
        message: `Kategori ${CATEGORY_LABEL[category]} minimal ${min} mapel untuk kelas ${grade}, saat ini ${count}.`,
      });
    }
  }

  for (const category of CATEGORY_OPTIONS) {
    if (config.minByCategory[category]) continue;
    const count = subjects.filter((s) => s.category === category).length;
    if (count > 0) {
      issues.push({
        level: "warning",
        message: `Kategori ${CATEGORY_LABEL[category]} tidak lazim untuk kelas ${grade} (${count} mapel).`,
      });
    }
  }

  return issues;
}

export function countByCategory(subjects: SubjectDraft[]) {
  return CATEGORY_OPTIONS.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    count: subjects.filter((s) => s.category === category).length,
  }));
}
