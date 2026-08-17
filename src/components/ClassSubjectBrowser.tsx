import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, GraduationCap, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await supabase.from("classes").select("*").order("name")).data ?? [],
  });
}

export function useSubjects(classId?: string | null) {
  return useQuery({
    queryKey: ["subjects", "by-class", classId ?? "all"],
    queryFn: async () => {
      if (!classId) {
        return (await supabase.from("subjects").select("*").order("name")).data ?? [];
      }
      const { data: curricula } = await supabase
        .from("curricula")
        .select("id")
        .eq("class_id", classId);
      const ids = (curricula ?? []).map((c) => c.id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("subjects")
        .select("*")
        .in("curriculum_id", ids)
        .order("name");
      return data ?? [];
    },
  });
}

function GridCard({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle?: string | null;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="font-display text-base font-semibold">{title}</span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      <span className="mt-auto flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
        Buka <ChevronRight className="size-3" />
      </span>
    </button>
  );
}

export function ClassGrid({ onSelect }: { onSelect: (id: string) => void }) {
  const classes = useClasses();
  const list = classes.data ?? [];
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Pilih Kelas</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((c) => (
          <GridCard
            key={c.id}
            title={c.name}
            subtitle={c.major}
            icon={<GraduationCap className="size-5" />}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>
      {classes.isSuccess && list.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Belum ada kelas terdaftar.
        </div>
      )}
    </section>
  );
}

export function SubjectGrid({
  classId,
  onSelect,
}: {
  classId?: string | null;
  onSelect: (id: string) => void;
}) {
  const subjects = useSubjects(classId);
  const list = subjects.data ?? [];
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Pilih Mata Pelajaran</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((s) => (
          <GridCard
            key={s.id}
            title={s.name}
            subtitle={s.code}
            icon={<BookOpen className="size-5" />}
            onClick={() => onSelect(s.id)}
          />
        ))}
      </div>
      {subjects.isSuccess && list.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Belum ada mata pelajaran terdaftar.
        </div>
      )}
    </section>
  );
}

export function BrowserBreadcrumb({
  rootLabel,
  className,
  subjectName,
  meetingName,
  onRoot,
  onClass,
  onSubject,
}: {
  rootLabel: string;
  className?: string | undefined;
  subjectName?: string | undefined;
  meetingName?: string | undefined;
  onRoot: () => void;
  onClass: () => void;
  onSubject?: (() => void) | undefined;
}) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Button variant="ghost" size="sm" onClick={onRoot} className="h-8 px-2">
        <Home className="mr-1 size-4" /> {rootLabel}
      </Button>
      {className && (
        <>
          <ChevronRight className="size-4" />
          <Button variant="ghost" size="sm" onClick={onClass} className="h-8 px-2">
            {className}
          </Button>
        </>
      )}
      {subjectName && (
        <>
          <ChevronRight className="size-4" />
          {onSubject && meetingName ? (
            <Button variant="ghost" size="sm" onClick={onSubject} className="h-8 px-2">
              {subjectName}
            </Button>
          ) : (
            <span className="px-2 font-medium text-foreground">{subjectName}</span>
          )}
        </>
      )}
      {meetingName && (
        <>
          <ChevronRight className="size-4" />
          <span className="px-2 font-medium text-foreground">{meetingName}</span>
        </>
      )}
    </nav>
  );
}

