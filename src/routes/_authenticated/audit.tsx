import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { History, Loader2, Search } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { AUDIT_ACTION_LABEL, AUDIT_ENTITY_LABEL } from "@/lib/audit";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Log Aktivitas — SMK Borneo Lestari" },
      {
        name: "description",
        content:
          "Riwayat aktivitas admin dan guru: penerbitan ujian, perubahan ujian, dan pembaruan nilai.",
      },
      { property: "og:title", content: "Log Aktivitas Admin & Guru" },
      {
        property: "og:description",
        content: "Jejak audit penerbitan ujian dan pembaruan penilaian.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

const ACTION_FILTERS = [
  { value: "all", label: "Semua aksi" },
  { value: "exam_published", label: "Terbit ujian" },
  { value: "exam_unpublished", label: "Tarik ujian" },
  { value: "grade_updated", label: "Nilai" },
];

function detailText(details: unknown) {
  if (!details || typeof details !== "object") return "";
  const entries = Object.entries(details as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== "" && v !== undefined,
  );
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(" • ");
}

function AuditPage() {
  const { isStaff, isAdmin, loading } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");

  const logs = useQuery({
    queryKey: ["audit-logs"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const list = logs.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((row) => {
      if (action !== "all" && row.action !== action) return false;
      if (!q) return true;
      return (
        row.actor_name.toLowerCase().includes(q) ||
        (row.entity_label ?? "").toLowerCase().includes(q) ||
        (AUDIT_ACTION_LABEL[row.action] ?? row.action).toLowerCase().includes(q)
      );
    });
  }, [logs.data, search, action]);

  if (!loading && !isStaff) {
    return (
      <AppShell>
        <PageHeader title="Akses ditolak" description="Halaman ini khusus guru dan admin." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Log Aktivitas"
        description={
          isAdmin
            ? "Jejak audit seluruh aktivitas guru dan admin pada ujian dan penilaian."
            : "Jejak audit aktivitas Anda pada ujian dan penilaian."
        }
        actions={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 pl-9"
              placeholder="Cari pelaku atau objek"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={60}
            />
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {ACTION_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={action === filter.value ? "default" : "outline"}
            onClick={() => setAction(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {logs.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat log…
        </div>
      )}

      {logs.isSuccess && rows.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <History className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
        </div>
      )}

      <ol className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-soft"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {AUDIT_ACTION_LABEL[row.action] ?? row.action}
                {row.entity_label ? ` — ${row.entity_label}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.actor_name} • {row.actor_role} •{" "}
                {new Date(row.created_at).toLocaleString("id-ID")}
              </p>
              {detailText(row.details) && (
                <p className="mt-1 text-xs text-muted-foreground">{detailText(row.details)}</p>
              )}
            </div>
            <Badge variant="secondary">
              {AUDIT_ENTITY_LABEL[row.entity_type] ?? row.entity_type}
            </Badge>
          </li>
        ))}
      </ol>
    </AppShell>
  );
}
