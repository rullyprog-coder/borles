export type AnalyticsQuestion = {
  id: string;
  type: string;
  content: string;
  points: number;
  correct_answers: string[];
  order_index: number;
};

export type AnalyticsAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  selected: string[] | null;
  text_answer?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  score: number | null;
  feedback?: string | null;
};

export type AnalyticsAttempt = {
  id: string;
  status: string;
  auto_score: number;
  manual_score: number;
  max_score: number;
  tab_switches?: number | null;
  leave_attempts?: number | null;
};

/** Kebijakan pengambilan nilai bila siswa boleh mengerjakan lebih dari satu kali. */
export type ScorePolicy = "highest" | "latest";

export const SCORE_POLICY_LABEL: Record<ScorePolicy, string> = {
  highest: "Nilai tertinggi",
  latest: "Nilai terakhir",
};

type CountableAttempt = AnalyticsAttempt & {
  student_id?: string;
  attempt_number?: number | null;
  started_at?: string;
};

/** Pilih satu percobaan per siswa sesuai kebijakan nilai ujian. */
export function pickCountedAttempt<T extends CountableAttempt>(
  attempts: T[],
  policy: ScorePolicy,
): T | null {
  const finished = attempts.filter((a) => a.status !== "in_progress");
  const pool = finished.length > 0 ? finished : attempts;
  if (pool.length === 0) return null;
  if (policy === "latest") {
    return [...pool].sort(
      (a, b) =>
        (a.attempt_number ?? 0) - (b.attempt_number ?? 0) ||
        new Date(a.started_at ?? 0).getTime() - new Date(b.started_at ?? 0).getTime(),
    )[pool.length - 1]!;
  }
  return [...pool].sort((a, b) => attemptScale(b) - attemptScale(a))[0]!;
}

/** Kumpulan id percobaan yang dihitung sebagai nilai akhir tiap siswa. */
export function countedAttemptIds<T extends CountableAttempt>(
  attempts: T[],
  policy: ScorePolicy,
): Set<string> {
  const byStudent = new Map<string, T[]>();
  for (const attempt of attempts) {
    const key = attempt.student_id ?? attempt.id;
    byStudent.set(key, [...(byStudent.get(key) ?? []), attempt]);
  }
  const ids = new Set<string>();
  for (const list of byStudent.values()) {
    const picked = pickCountedAttempt(list, policy);
    if (picked) ids.add(picked.id);
  }
  return ids;
}

const MANUAL_TYPES = ["essay", "file"];

export function isAnswerCorrect(question: AnalyticsQuestion, answer?: AnalyticsAnswer) {
  if (!answer) return false;
  if (MANUAL_TYPES.includes(question.type)) return Number(answer.score ?? 0) >= question.points;
  const given = [...(answer.selected ?? [])].sort().join("|");
  const key = [...question.correct_answers].sort().join("|");
  return given.length > 0 && given === key;
}

export function scoreOf(question: AnalyticsQuestion, answer?: AnalyticsAnswer) {
  if (!answer) return 0;
  if (answer.score !== null && answer.score !== undefined) return Number(answer.score);
  return isAnswerCorrect(question, answer) ? question.points : 0;
}

export function attemptTotal(attempt: AnalyticsAttempt) {
  return Number(attempt.auto_score) + Number(attempt.manual_score);
}

export function attemptScale(attempt: AnalyticsAttempt) {
  const max = Number(attempt.max_score) || 0;
  return max > 0 ? Math.round((attemptTotal(attempt) / max) * 100) : 0;
}

/** Statistik per butir soal untuk seluruh peserta. */
export function questionStats(
  questions: AnalyticsQuestion[],
  answers: AnalyticsAnswer[],
  attemptIds: string[],
) {
  return questions.map((question, index) => {
    const rows = attemptIds.map((id) =>
      answers.find((a) => a.attempt_id === id && a.question_id === question.id),
    );
    const answered = rows.filter(Boolean).length;
    const correct = rows.filter((a) => isAnswerCorrect(question, a)).length;
    const totalScore = rows.reduce((sum, a) => sum + scoreOf(question, a), 0);
    const peserta = attemptIds.length || 1;
    return {
      nomor: index + 1,
      id: question.id,
      ringkas: question.content,
      tipe: question.type,
      poin: Number(question.points),
      answered,
      correct,
      rataSkor: totalScore / peserta,
      persenBenar: Math.round((correct / peserta) * 100),
    };
  });
}

/** Statistik per peserta: benar, persen benar, dan selisih dengan rata-rata kelas. */
export function attemptStats(
  attempt: AnalyticsAttempt,
  questions: AnalyticsQuestion[],
  answers: AnalyticsAnswer[],
) {
  const rows = questions.map((q) => ({
    question: q,
    answer: answers.find((a) => a.attempt_id === attempt.id && a.question_id === q.id),
  }));
  const correct = rows.filter((r) => isAnswerCorrect(r.question, r.answer)).length;
  return {
    correct,
    total: questions.length,
    persenBenar: questions.length ? Math.round((correct / questions.length) * 100) : 0,
    perQuestion: rows.map((r, index) => ({
      nomor: index + 1,
      question: r.question,
      answer: r.answer,
      score: scoreOf(r.question, r.answer),
      correct: isAnswerCorrect(r.question, r.answer),
    })),
  };
}

export function classAverage(attempts: AnalyticsAttempt[]) {
  const graded = attempts.filter((a) => a.status !== "in_progress");
  if (graded.length === 0) return 0;
  return graded.reduce((sum, a) => sum + attemptScale(a), 0) / graded.length;
}
