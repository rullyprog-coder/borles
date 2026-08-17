import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, School, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/kelas")({
  head: () => ({
    meta: [
      { title: "Kelas — SMK Borneo Lestari" },
      { name: "description", content: "Kelola daftar kelas beserta jurusannya di portal ujian." },
      { property: "og:title", content: "Kelas" },
      { property: "og:description", content: "Kelola daftar kelas dan jurusan sekolah." },
    ],
  }),
  component: KelasPage,
});

function KelasPage() {
  const { isAdmin, loading } = useCurrentUser();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");

  const classes = useQuery({
    queryKey: ["classes"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addClass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("classes")
        .insert({ name: name.trim(), major: major.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kelas ditambahkan");
      setName("");
      setMajor("");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (error: Error) => toast.error("Gagal menambahkan: " + error.message),
  });

  const removeClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kelas dihapus");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
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

  const list = classes.data ?? [];

  return (
    <AppShell>
      <PageHeader title="Kelas" description="Input kelas beserta jurusannya." />

      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("Nama kelas wajib diisi");
              return;
            }
            addClass.mutate();
          }}
        >
          <div className="min-w-40 flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Nama kelas
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="X TKJ 1" />
          </div>
          <div className="min-w-40 flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Jurusan
            </label>
            <Input
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="Teknik Komputer dan Jaringan"
            />
          </div>
          <Button type="submit" disabled={addClass.isPending}>
            <Plus className="size-4" />
            Tambah
          </Button>
        </form>
      </div>

      <div className="mt-5 rounded-xl border bg-card">
        {classes.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Memuat…</p>
        ) : list.length === 0 ? (
          <div className="p-8 text-center">
            <School className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Belum ada kelas.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  {c.major && <p className="text-xs text-muted-foreground">{c.major}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus ${c.name}`}
                  onClick={() => removeClass.mutate(c.id)}
                  disabled={removeClass.isPending}
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
