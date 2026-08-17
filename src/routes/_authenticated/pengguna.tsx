import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { RegisterStudentDialog } from "@/components/RegisterStudentDialog";
import { EditUserDialog, ResetPasswordDialog } from "@/components/UserAdminDialogs";
import { useServerFn } from "@tanstack/react-start";
import { adminListUserEmails } from "@/lib/admin-users.functions";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, roleLabel, type AppRole } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/pengguna")({
  head: () => ({
    meta: [
      { title: "Manajemen Pengguna — SMK Borneo Lestari" },
      { name: "description", content: "Kelola peran admin, guru, dan siswa pada portal ujian." },
      { property: "og:title", content: "Manajemen Pengguna" },
      { property: "og:description", content: "Kelola peran admin, guru, dan siswa." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin, isStaff, loading, userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [classFilter, setClassFilter] = useState("all");
  const listEmails = useServerFn(adminListUserEmails);

  const emails = useQuery({
    queryKey: ["user-emails"],
    enabled: isAdmin,
    queryFn: async () => listEmails(),
  });

  const emailMap = new Map((emails.data ?? []).map((u) => [u.id, u.email]));

  const users = useQuery({
    queryKey: ["all-users"],
    enabled: isStaff,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, AppRole>();
      for (const row of roles ?? []) {
        const current = roleMap.get(row.user_id);
        const next = row.role as AppRole;
        const rank = { admin: 3, guru: 2, siswa: 1 } as const;
        if (!current || rank[next] > rank[current]) roleMap.set(row.user_id, next);
      }
      return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "siswa" }));
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", id);
      if (delError) throw delError;
      const { error } = await supabase.from("user_roles").insert({ user_id: id, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Peran diperbarui");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (error: Error) => toast.error("Gagal memperbarui peran: " + error.message),
  });

  if (!loading && !isStaff) {
    return (
      <AppShell>
        <PageHeader title="Akses ditolak" description="Halaman ini khusus guru dan administrator." />
      </AppShell>
    );
  }

  const all = users.data ?? [];

  const classOptions = [
    ...new Set(all.filter((u) => u.role === "siswa" && u.class_name).map((u) => u.class_name!)),
  ].sort((a, b) => a.localeCompare(b));

  const counts = {
    all: all.length,
    admin: all.filter((u) => u.role === "admin").length,
    guru: all.filter((u) => u.role === "guru").length,
    siswa: all.filter((u) => u.role === "siswa").length,
  };

  const filtered = all.filter((user) => {
    if (roleFilter !== "all" && user.role !== roleFilter) return false;
    if (roleFilter === "siswa" && classFilter !== "all" && (user.class_name ?? "") !== classFilter)
      return false;
    const q = search.toLowerCase();
    return (
      !q ||
      user.full_name.toLowerCase().includes(q) ||
      (user.identifier ?? "").toLowerCase().includes(q) ||
      (user.class_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <PageHeader
        title="Manajemen Pengguna"
        description="Daftarkan akun siswa dan atur peran pengguna."
        actions={
          <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-9"
              placeholder="Cari nama, NIS, atau kelas"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={60}
            />
          </div>
          <RegisterStudentDialog />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { value: "all", label: "Semua", count: counts.all },
            { value: "admin", label: "Administrator", count: counts.admin },
            { value: "guru", label: "Guru", count: counts.guru },
            { value: "siswa", label: "Siswa", count: counts.siswa },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={roleFilter === tab.value ? "default" : "outline"}
            onClick={() => {
              setRoleFilter(tab.value);
              if (tab.value !== "siswa") setClassFilter("all");
            }}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">{tab.count}</span>
          </Button>
        ))}

        {roleFilter === "siswa" && classOptions.length > 0 && (
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Semua angkatan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua angkatan</SelectItem>
              {classOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>


      <div className="overflow-x-auto rounded-xl border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>NIS / NIP</TableHead>
              <TableHead>Kelas</TableHead>
              {isAdmin && <TableHead>Email</TableHead>}
              <TableHead>Peran</TableHead>
              <TableHead className="w-44">Ubah Peran</TableHead>
              {isAdmin && <TableHead className="w-56">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.identifier ?? "-"}</TableCell>
                <TableCell>{user.class_name ?? "-"}</TableCell>
                {isAdmin && (
                  <TableCell className="text-muted-foreground">
                    {emailMap.get(user.id) ?? "-"}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {roleLabel(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    disabled={user.id === userId || !isAdmin}
                    onValueChange={(value) =>
                      changeRole.mutate({ id: user.id, role: value as AppRole })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="siswa">Siswa</SelectItem>
                      <SelectItem value="guru">Guru</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <EditUserDialog
                        user={{
                          id: user.id,
                          full_name: user.full_name,
                          identifier: user.identifier,
                          class_name: user.class_name,
                          major: user.major,
                          email: emailMap.get(user.id),
                        }}
                      />
                      <ResetPasswordDialog
                        user={{
                          id: user.id,
                          full_name: user.full_name,
                          identifier: user.identifier,
                          class_name: user.class_name,
                          major: user.major,
                          email: emailMap.get(user.id),
                        }}
                      />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {users.isSuccess && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 5} className="py-10 text-center text-sm text-muted-foreground">
                  Tidak ada pengguna yang cocok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4" />
        Peran disimpan pada tabel terpisah dan divalidasi di server untuk mencegah eskalasi hak akses.
      </p>
    </AppShell>
  );
}
