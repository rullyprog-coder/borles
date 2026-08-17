import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  BookOpenCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  School,
  Users,
  History,
  DatabaseBackup,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, roleLabel } from "@/lib/auth";
import { useDbStatus } from "@/lib/db-status";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Indikator koneksi database di header aplikasi. */
export function DbStatusBadge() {
  const { status, checkedAt } = useDbStatus();
  const { isAdmin } = useCurrentUser();
  const onlineLabel = isAdmin ? "Database terhubung" : "Terhubung Dengan Server";
  const offlineLabel = isAdmin ? "Database putus" : "Terputus Dari Server";
  const label =
    status === "online" ? onlineLabel : status === "offline" ? offlineLabel : "Memeriksa…";
  return (
    <span
      title={checkedAt ? `Diperiksa ${checkedAt.toLocaleTimeString("id-ID")}` : undefined}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
        status === "online" && "border-primary/30 bg-primary/10 text-primary",
        status === "offline" && "border-destructive/30 bg-destructive/10 text-destructive",
        status === "checking" && "border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "online" && "bg-primary",
          status === "offline" && "bg-destructive",
          status === "checking" && "animate-pulse bg-muted-foreground",
        )}
      />
      {label}
    </span>
  );
}

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const staffNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/exams", label: "Kelola Ujian", icon: ClipboardList },
];

const studentNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ujian", label: "Ujian Saya", icon: BookOpenCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, role, isAdmin, isStaff } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = isAdmin
    ? [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard } as NavItem]
    : isStaff
      ? [...staffNav]
      : [...studentNav];
  if (isStaff && !isAdmin) {
    items.push({ to: "/audit", label: "Log Aktivitas", icon: History });
  }
  if (isAdmin) {
    items.push({ to: "/kelas", label: "Kelas", icon: School });
    items.push({ to: "/kurikulum", label: "Kurikulum", icon: Library });
    items.push({ to: "/pengguna", label: "Pengguna", icon: Users });
    items.push({ to: "/audit", label: "Log Aktivitas", icon: History });
    items.push({ to: "/backup", label: "Backup & Restore", icon: DatabaseBackup });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl gradient-gold">
          <GraduationCap className="size-5 text-gold-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold">SMK Borneo Lestari</p>
          <p className="truncate text-xs text-sidebar-foreground/70">Ujian Online ASIK</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
          <p className="truncate text-sm font-semibold">{profile?.full_name || "Pengguna"}</p>
          <p className="text-xs text-sidebar-foreground/70">{roleLabel(role)}</p>
        </div>
        <button
          onClick={signOut}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60"
        >
          <LogOut className="size-4" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Tutup menu"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
          <button
            aria-label="Tutup"
            className="absolute right-4 top-4 rounded-md bg-card p-2"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card/80 px-4 py-3 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </Button>
          <span className="font-display text-sm font-bold lg:hidden">SMK Borneo Lestari</span>
          <div className="ml-auto">
            <DbStatusBadge />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
