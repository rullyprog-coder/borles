import type { SubjectDraft } from "@/lib/curriculum-config";

export type CurriculumSnapshot = {
  curriculumName: string;
  className: string;
  grade: string | null;
  subjects: Array<Omit<SubjectDraft, "id">>;
};

export function toSnapshot(
  curriculumName: string,
  className: string,
  grade: string | null,
  subjects: SubjectDraft[],
): CurriculumSnapshot {
  return {
    curriculumName,
    className,
    grade,
    subjects: subjects
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({
        name: s.name.trim(),
        code: s.code.trim(),
        category: s.category,
        hours: s.hours,
        order_index: s.order_index,
      })),
  };
}

export type DiffRow = {
  key: string;
  status: "added" | "removed" | "changed" | "same";
  before?: Omit<SubjectDraft, "id"> | undefined;
  after?: Omit<SubjectDraft, "id"> | undefined;
  changes: string[];
};

const FIELD_LABEL: Record<string, string> = {
  name: "Nama",
  code: "Kode",
  category: "Kategori",
  hours: "Jam",
  order_index: "Urutan",
};

/** Bandingkan dua snapshot kurikulum dan hasilkan daftar perbedaan per mapel. */
export function diffSnapshots(before: CurriculumSnapshot | null, after: CurriculumSnapshot): DiffRow[] {
  const beforeMap = new Map((before?.subjects ?? []).map((s) => [s.code.toUpperCase(), s]));
  const afterMap = new Map(after.subjects.map((s) => [s.code.toUpperCase(), s]));
  const keys = Array.from(new Set([...beforeMap.keys(), ...afterMap.keys()]));

  const rows: DiffRow[] = keys.map((key) => {
    const b = beforeMap.get(key);
    const a = afterMap.get(key);
    if (!b && a) return { key, status: "added", after: a, changes: [] };
    if (b && !a) return { key, status: "removed", before: b, changes: [] };
    const changes: string[] = [];
    for (const field of ["name", "code", "category", "hours", "order_index"] as const) {
      if (String(b![field]) !== String(a![field])) {
        changes.push(`${FIELD_LABEL[field]}: ${b![field]} → ${a![field]}`);
      }
    }
    return { key, status: changes.length ? "changed" : "same", before: b, after: a, changes };
  });

  const rank = { added: 0, removed: 1, changed: 2, same: 3 } as const;
  return rows.sort(
    (x, y) => rank[x.status] - rank[y.status] || (x.after?.order_index ?? 0) - (y.after?.order_index ?? 0),
  );
}

export function summarizeDiff(rows: DiffRow[]) {
  return {
    added: rows.filter((r) => r.status === "added").length,
    removed: rows.filter((r) => r.status === "removed").length,
    changed: rows.filter((r) => r.status === "changed").length,
  };
}
