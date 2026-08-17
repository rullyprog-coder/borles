import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  classId: string;
  className: string;
  userId: string | null | undefined;
};

const PREVIEW_COUNT = 6;

export function StudentEnrollment({ classId, className, userId }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const enrolled = useQuery({
    queryKey: ["class-students", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("id, student_id")
        .eq("class_id", classId);
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((row) => row.student_id))];
      if (ids.length === 0)
        return [] as Array<{
          id: string;
          student_id: string;
          full_name: string;
          identifier: string | null;
        }>;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, identifier")
        .in("id", ids);
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));
      const seen = new Set<string>();
      return rows
        .filter((row) => {
          if (seen.has(row.student_id)) return false;
          seen.add(row.student_id);
          return true;
        })
        .map((row) => ({
          id: row.id,
          student_id: row.student_id,
          full_name: map.get(row.student_id)?.full_name ?? "Tanpa nama",
          identifier: map.get(row.student_id)?.identifier ?? null,
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });

  const students = useQuery({
    queryKey: ["students-directory"],
    enabled: open,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "siswa");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, identifier, class_name, major")
        .in("id", ids)
        .order("full_name");
      return profiles ?? [];
    },
  });

  const enrolledIds = useMemo(
    () => new Set((enrolled.data ?? []).map((row) => row.student_id)),
    [enrolled.data],
  );

  const candidates = (students.data ?? []).filter((student) => {
    if (enrolledIds.has(student.id)) return false;
    const q = search.trim().toLowerCase();
    return (
      !q ||
      student.full_name.toLowerCase().includes(q) ||
      (student.identifier ?? "").toLowerCase().includes(q) ||
      (student.class_name ?? "").toLowerCase().includes(q)
    );
  });

  const enroll = useMutation({
    mutationFn: async (studentIds: string[]) => {
      const { error } = await supabase.from("class_students").insert(
        studentIds.map((student_id) => ({
          class_id: classId,
          subject_id: null,
          student_id,
          created_by: userId!,
        })),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Siswa berhasil didaftarkan");
      setPicked([]);
      setSearch("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["class-students", classId] });
    },
    onError: (error: Error) => toast.error("Gagal mendaftarkan siswa: " + error.message),
  });

  const remove = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("class_students")
        .delete()
        .eq("class_id", classId)
        .eq("student_id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Siswa dikeluarkan dari daftar");
      queryClient.invalidateQueries({ queryKey: ["class-students", classId] });
    },
    onError: (error: Error) => toast.error("Gagal menghapus: " + error.message),
  });

  const list = enrolled.data ?? [];
  const visible = showAll ? list : list.slice(0, PREVIEW_COUNT);

  return (
    <section className="rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Siswa Terdaftar
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {list.length} siswa • {className}
          </span>
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={!userId}>
              <UserPlus className="mr-1.5 size-4" /> Daftarkan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Daftarkan Siswa</DialogTitle>
              <DialogDescription>
                Pilih siswa yang sudah diinput admin untuk kelas {className}.
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari nama, NIS, atau kelas"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                maxLength={60}
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-2">
              {students.isLoading && (
                <p className="p-3 text-sm text-muted-foreground">Memuat daftar siswa…</p>
              )}
              {students.isSuccess && candidates.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  Tidak ada siswa tersedia. Minta admin menambahkan akun siswa terlebih dahulu.
                </p>
              )}
              {candidates.map((student) => (
                <label
                  key={student.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                >
                  <Checkbox
                    checked={picked.includes(student.id)}
                    onCheckedChange={(value) =>
                      setPicked((prev) =>
                        value ? [...prev, student.id] : prev.filter((id) => id !== student.id),
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{student.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {student.identifier || "Tanpa NIS"}
                      {student.class_name ? ` • ${student.class_name}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={picked.length === 0 || enroll.isPending}
              onClick={() => enroll.mutate(picked)}
            >
              {enroll.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Daftarkan {picked.length > 0 ? `${picked.length} siswa` : ""}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {list.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visible.map((row) => (
            <span
              key={row.student_id}
              className="group inline-flex items-center gap-1.5 rounded-full border bg-muted/40 py-1 pl-2.5 pr-1.5 text-xs"
            >
              <span className="max-w-[12rem] truncate">{row.full_name}</span>
              <button
                type="button"
                aria-label={`Keluarkan ${row.full_name}`}
                className="rounded-full p-0.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  if (confirm(`Keluarkan ${row.full_name} dari kelas?`)) remove.mutate(row.student_id);
                }}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {list.length > PREVIEW_COUNT && (
            <Button
              variant="link"
              size="sm"
              className="h-6 px-1 text-xs"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? "Tampilkan lebih sedikit" : `Lihat semua (${list.length})`}
            </Button>
          )}
        </div>
      )}

      {enrolled.isSuccess && list.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Belum ada siswa terdaftar di kelas ini.</p>
      )}
    </section>
  );
}
