/** Metadata backup yang aman diimpor dari sisi klien maupun server. */

/** Tabel yang diikutsertakan dalam berkas backup, berurutan sesuai relasi. */
export const BACKUP_TABLES = [
  "classes",
  "curricula",
  "subjects",
  "meetings",
  "exams",
  "questions",
  "question_bank",
  "profiles",
  "user_roles",
  "class_students",
  "exam_attempts",
  "answers",
] as const;

/** Tabel yang boleh ditulis ulang saat restore (data akademik, bukan akun/hasil ujian). */
export const RESTORABLE_TABLES = [
  "classes",
  "curricula",
  "subjects",
  "meetings",
  "exams",
  "questions",
  "question_bank",
] as const;

export const BACKUP_TABLE_LABEL: Record<string, string> = {
  classes: "Kelas",
  curricula: "Kurikulum",
  subjects: "Mata Pelajaran",
  meetings: "Pertemuan",
  exams: "Ujian",
  questions: "Soal Ujian",
  question_bank: "Bank Soal",
  profiles: "Profil Pengguna",
  user_roles: "Peran Pengguna",
  class_students: "Penempatan Siswa",
  exam_attempts: "Percobaan Ujian",
  answers: "Jawaban Siswa",
};

/** Bucket penyimpanan lampiran yang diikutsertakan dalam backup. */
export const BACKUP_BUCKETS = ["exam-uploads", "question-images"] as const;

export type BackupBucket = (typeof BACKUP_BUCKETS)[number];

export const BACKUP_BUCKET_LABEL: Record<string, string> = {
  "exam-uploads": "Berkas Unggahan Siswa",
  "question-images": "Gambar Soal",
};

/** Batas ukuran per berkas agar tiap batch tetap dapat dikirim lewat RPC. */
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
/** Batas total byte per batch unduh/unggah lampiran. */
export const MAX_BATCH_BYTES = 6 * 1024 * 1024;
