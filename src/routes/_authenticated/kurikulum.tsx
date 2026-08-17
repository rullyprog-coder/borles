import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, GraduationCap, Library, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ClassGrid, useClasses } from "@/components/ClassSubjectBrowser";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/kurikulum")({
  head: () => ({
    meta: [
      { title: "Kurikulum — SMK Borneo Lestari" },
      { name: "description", content: "Kelola jenis kurikulum dan mata pelajaran di dalamnya." },
      { property: "og:title", content: "Kurikulum" },
      { property: "og:description", content: "Kelola jenis kurikulum dan mata pelajarannya." },
    ],
  }),
  component: KurikulumPage,
});

function KurikulumPage() {
  const { isAdmin, loading } = useCurrentUser();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [curriculumName, setCurriculumName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const classes = useClasses();

  const curricula = useQuery({
    queryKey: ["curricula", selectedClass?.id],
    enabled: isAdmin && !!selectedClass,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curricula")
        .select("*")
        .eq("class_id", selectedClass!.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const subjects = useQuery({
    queryKey: ["subjects", selected?.id],
    enabled: isAdmin && !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("curriculum_id", selected!.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCurriculum = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("curricula")
        .insert({ name: curriculumName.trim(), class_id: selectedClass!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kurikulum ditambahkan");
      setCurriculumName("");
      queryClient.invalidateQueries({ queryKey: ["curricula"] });
    },
    onError: (error: Error) => toast.error("Gagal menambahkan: " + error.message),
  });

  const removeCurriculum = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("curricula").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kurikulum dihapus");
      queryClient.invalidateQueries({ queryKey: ["curricula"] });
    },
    onError: (error: Error) => toast.error("Gagal menghapus: " + error.message),
  });

  const addSubject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").insert({
        name: subjectName.trim(),
        code: subjectCode.trim(),
        curriculum_id: selected!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mata pelajaran ditambahkan");
      setSubjectName("");
      setSubjectCode("");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error: Error) =>
      toast.error(
        error.message.includes("subjects_code_key")
          ? "Kode mata pelajaran sudah dipakai, gunakan kode lain"
          : "Gagal menambahkan: " + error.message,
      ),
  });

  const removeSubject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mata pelajaran dihapus");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error: Error) => toast.error("Gagal menghapus: " + error.message),
  });

  if (!loading && !isAdmin) {
    return (
      <AppShell>
        <PageHeader title="Akses ditolak" description="Halaman ini khusus administrator." />
      </AppShell>
    );
  }

  if (!selectedClass) {
    return (
      <AppShell>
        <PageHeader
          title="Kurikulum"
          description="Pilih kelas lebih dulu untuk mengelola kurikulum dan mata pelajarannya."
        />
        <ClassGrid
          onSelect={(id) => {
            const found = (classes.data ?? []).find((c) => c.id === id);
            setSelectedClass({ id, name: found?.name ?? "Kelas" });
          }}
        />
      </AppShell>
    );
  }

  if (selected) {
    const list = subjects.data ?? [];
    return (
      <AppShell>
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => setSelected(null)}>
          <ChevronLeft className="size-4" />
          Kembali ke daftar kurikulum
        </Button>
        <PageHeader
          title={selected.name}
          description={`Kelola mata pelajaran pada kurikulum ini — ${selectedClass.name}.`}
        />

        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!subjectName.trim()) {
                toast.error("Nama mata pelajaran wajib diisi");
                return;
              }
              if (!subjectCode.trim()) {
                toast.error("Kode mata pelajaran wajib diisi dan harus unik");
                return;
              }
              addSubject.mutate();
            }}
          >
            <div className="min-w-48 flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Nama mata pelajaran
              </label>
              <Input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Contoh: Matematika"
              />
            </div>
            <div className="w-32">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Kode (unik, wajib)
              </label>
              <Input
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="MTK"
              />
            </div>
            <Button type="submit" disabled={addSubject.isPending}>
              <Plus className="size-4" />
              Tambah
            </Button>
          </form>
        </div>

        <div className="mt-5 rounded-xl border bg-card">
          {subjects.isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Memuat…</p>
          ) : list.length === 0 ? (
            <div className="p-8 text-center">
              <Library className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Belum ada mata pelajaran.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {list.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    {s.code && <p className="text-xs text-muted-foreground">{s.code}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${s.name}`}
                    onClick={() => removeSubject.mutate(s.id)}
                    disabled={removeSubject.isPending}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AppShell>
    );
  }

  const list = curricula.data ?? [];

  return (
    <AppShell>
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => setSelectedClass(null)}>
        <ChevronLeft className="size-4" />
        Kembali ke daftar kelas
      </Button>
      <PageHeader
        title={`Kurikulum — ${selectedClass.name}`}
        description="Tambahkan jenis kurikulum untuk kelas ini, lalu isi mata pelajarannya."
      />

      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!curriculumName.trim()) {
              toast.error("Nama kurikulum wajib diisi");
              return;
            }
            addCurriculum.mutate();
          }}
        >
          <div className="min-w-48 flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Jenis kurikulum
            </label>
            <Input
              value={curriculumName}
              onChange={(e) => setCurriculumName(e.target.value)}
              placeholder="Contoh: Kurikulum Merdeka"
            />
          </div>
          <Button type="submit" disabled={addCurriculum.isPending}>
            <Plus className="size-4" />
            Tambah
          </Button>
        </form>
      </div>

      <div className="mt-5 rounded-xl border bg-card">
        {curricula.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Memuat…</p>
        ) : list.length === 0 ? (
          <div className="p-8 text-center">
            <GraduationCap className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Belum ada kurikulum.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setSelected({ id: c.id, name: c.name })}
                >
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Kelola mata pelajaran</p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus ${c.name}`}
                  onClick={() => removeCurriculum.mutate(c.id)}
                  disabled={removeCurriculum.isPending}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
