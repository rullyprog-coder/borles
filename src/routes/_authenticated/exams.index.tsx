import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { BarChart3, ClipboardList, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  BrowserBreadcrumb,
  ClassGrid,
  SubjectGrid,
  useClasses,
  useSubjects,
} from "@/components/ClassSubjectBrowser";
import { StudentEnrollment } from "@/components/StudentEnrollment";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export const Route = createFileRoute("/_authenticated/exams/")({
  head: () => ({
    meta: [
      { title: "Kelola Ujian — SMK Borneo Lestari" },
      { name: "description", content: "Buat, terbitkan, dan pantau ujian online sekolah." },
      { property: "og:title", content: "Kelola Ujian — SMK Borneo Lestari" },
      { property: "og:description", content: "Buat, terbitkan, dan pantau ujian online sekolah." },
    ],
  }),
  component: ExamsPage,
});

const examSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
  description: z.string().trim().max(1000).nullable(),
  duration_minutes: z.number().int().min(1).max(600),
  max_attempts: z.number().int().min(1).max(20),
  score_policy: z.enum(["highest", "latest"]),
  subject_id: z.string().uuid(),
  class_id: z.string().uuid(),
  meeting_id: z.string().uuid(),
  start_at: z.string().nullable(),
  end_at: z.string().nullable(),
});

type ExamRow = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  max_attempts?: number;
  score_policy?: string;
  is_published: boolean;
  start_at: string | null;
  end_at: string | null;
  class_id: string;
  subject_id: string;
  meeting_id: string;
  created_by: string;
  created_at: string;
  classes?: { name: string } | null;
  subjects?: { name: string } | null;
};

const meetingSchema = z.object({
  title: z.string().trim().min(3, "Judul pertemuan minimal 3 karakter").max(150),
  description: z.string().trim().max(1000).nullable(),
  order_index: z.number().int().min(1).max(200),
});

function ExamsPage() {
  const { userId, isStaff, loading, profile, role } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editExam, setEditExam] = useState<ExamRow | null>(null);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState<{
    id: string;
    title: string;
    description: string | null;
    order_index: number;
  } | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const pickedSubject = !!classId && !!subjectId;
  const ready = pickedSubject && !!meetingId;

  const classes = useClasses();
  const subjects = useSubjects(classId);
  const className = (classes.data ?? []).find((c) => c.id === classId)?.name ?? "";
  const subjectName = (subjects.data ?? []).find((s) => s.id === subjectId)?.name ?? "";

  const meetings = useQuery({
    queryKey: ["meetings", classId, subjectId],
    enabled: pickedSubject,
    queryFn: async () =>
      (
        await supabase
          .from("meetings")
          .select("*")
          .eq("class_id", classId!)
          .eq("subject_id", subjectId!)
          .order("order_index", { ascending: true })
      ).data ?? [],
  });
  const meetingName = (meetings.data ?? []).find((m) => m.id === meetingId)?.title ?? "";

  const createMeeting = useMutation({
    mutationFn: async (values: z.infer<typeof meetingSchema>) => {
      const { data, error } = await supabase
        .from("meetings")
        .insert({
          ...values,
          class_id: classId!,
          subject_id: subjectId!,
          created_by: userId!,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (meeting) => {
      toast.success("Pertemuan dibuat");
      setMeetingOpen(false);
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setMeetingId(meeting.id);
    },
    onError: (error: Error) => toast.error("Gagal membuat pertemuan: " + error.message),
  });

  const removeMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pertemuan dihapus");
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (error: Error) => toast.error("Gagal menghapus: " + error.message),
  });

  const updateMeeting = useMutation({
    mutationFn: async (values: z.infer<typeof meetingSchema> & { id: string }) => {
      const { id, ...rest } = values;
      const { error } = await supabase.from("meetings").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pertemuan diperbarui");
      setEditMeeting(null);
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (error: Error) => toast.error("Gagal memperbarui: " + error.message),
  });



  const exams = useQuery({
    queryKey: ["exams", meetingId],
    enabled: ready,
    queryFn: async () =>
      (
        await supabase
          .from("exams")
          .select("*, subjects(name), classes(name)")
          .eq("meeting_id", meetingId!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });


  const createExam = useMutation({
    mutationFn: async (values: z.infer<typeof examSchema>) => {
      const { data, error } = await supabase
        .from("exams")
        .insert({ ...values, created_by: userId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (exam) => {
      toast.success("Ujian dibuat. Tambahkan soal sekarang.");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      navigate({ to: "/exams/$examId", params: { examId: exam.id } });
    },
    onError: (error: Error) => toast.error("Gagal membuat ujian: " + error.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, value, title }: { id: string; value: boolean; title: string }) => {
      const { error } = await supabase.from("exams").update({ is_published: value }).eq("id", id);
      if (error) throw error;
      await logAudit({
        action: value ? "exam_published" : "exam_unpublished",
        entityType: "exam",
        entityId: id,
        entityLabel: title,
        actorName: profile?.full_name ?? null,
        actorRole: role ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (error: Error) => toast.error("Gagal memperbarui: " + error.message),
  });

  const removeExam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ujian dihapus");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error: Error) => toast.error("Gagal menghapus: " + error.message),
  });

  const updateExam = useMutation({
    mutationFn: async (values: z.infer<typeof examSchema> & { id: string }) => {
      const { id, ...payload } = values;
      const { error } = await supabase.from("exams").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ujian diperbarui");
      setEditOpen(false);
      setEditExam(null);
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error: Error) => toast.error("Gagal memperbarui: " + error.message),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = examSchema.safeParse({
      title: form.get("title"),
      description: String(form.get("description") ?? "") || null,
      duration_minutes: Number(form.get("duration_minutes")),
      subject_id: subjectId,
      class_id: classId,
      meeting_id: meetingId,
      max_attempts: Number(form.get("max_attempts")),
      score_policy: String(form.get("score_policy") ?? "highest"),

      start_at: form.get("start_at") ? new Date(String(form.get("start_at"))).toISOString() : null,
      end_at: form.get("end_at") ? new Date(String(form.get("end_at"))).toISOString() : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    createExam.mutate(parsed.data);
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editExam) return;
    const form = new FormData(event.currentTarget);
    const parsed = examSchema.safeParse({
      title: form.get("title"),
      description: String(form.get("description") ?? "") || null,
      duration_minutes: Number(form.get("duration_minutes")),
      subject_id: editExam.subject_id,
      class_id: editExam.class_id,
      meeting_id: editExam.meeting_id,
      max_attempts: Number(form.get("max_attempts")),
      score_policy: String(form.get("score_policy") ?? "highest"),
      start_at: form.get("start_at") ? new Date(String(form.get("start_at"))).toISOString() : null,
      end_at: form.get("end_at") ? new Date(String(form.get("end_at"))).toISOString() : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    updateExam.mutate({ ...parsed.data, id: editExam.id });
  }

  function toDateTimeLocal(value: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  if (!loading && !isStaff) {
    return (
      <AppShell>
        <PageHeader title="Akses ditolak" description="Halaman ini khusus guru dan admin." />
        <Button asChild>
          <Link to="/ujian">Ke daftar ujian saya</Link>
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Kelola Ujian"
        description="Masuk ke kelas, pilih mata pelajaran, buat pertemuan, lalu tambahkan kuis beserta soalnya."
        actions={
          ready ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" /> Kuis / Ujian Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Buat Kuis / Ujian Baru</DialogTitle>
                  <DialogDescription>
                    {className} • {subjectName} • {meetingName}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Judul Ujian</Label>
                    <Input id="title" name="title" required maxLength={150} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea id="description" name="description" maxLength={1000} rows={3} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="duration_minutes">Durasi (menit)</Label>
                      <Input
                        id="duration_minutes"
                        name="duration_minutes"
                        type="number"
                        min={1}
                        max={600}
                        defaultValue={60}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="max_attempts">Batas pengerjaan (kali)</Label>
                      <Input
                        id="max_attempts"
                        name="max_attempts"
                        type="number"
                        min={1}
                        max={20}
                        defaultValue={1}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="score_policy">Nilai yang diambil</Label>
                      <select
                        id="score_policy"
                        name="score_policy"
                        defaultValue="highest"
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="highest">Nilai tertinggi</option>
                        <option value="latest">Nilai terakhir</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="start_at">Mulai</Label>
                      <Input id="start_at" name="start_at" type="datetime-local" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_at">Selesai</Label>
                      <Input id="end_at" name="end_at" type="datetime-local" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createExam.isPending}>
                    {createExam.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Simpan & Tambah Soal
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : pickedSubject ? (
            <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" /> Pertemuan Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Buat Pertemuan Baru</DialogTitle>
                  <DialogDescription>
                    Kelas {className} • Mata pelajaran {subjectName}
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const parsed = meetingSchema.safeParse({
                      title: form.get("m_title"),
                      description: String(form.get("m_description") ?? "") || null,
                      order_index: Number(form.get("m_order")),
                    });
                    if (!parsed.success) {
                      toast.error(parsed.error.issues[0]!.message);
                      return;
                    }
                    createMeeting.mutate(parsed.data);
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="m_title">Judul Pertemuan</Label>
                    <Input
                      id="m_title"
                      name="m_title"
                      required
                      maxLength={150}
                      defaultValue={`Pertemuan ${(meetings.data?.length ?? 0) + 1}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="m_description">Materi / Deskripsi</Label>
                    <Textarea id="m_description" name="m_description" maxLength={1000} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="m_order">Urutan</Label>
                    <Input
                      id="m_order"
                      name="m_order"
                      type="number"
                      min={1}
                      max={200}
                      defaultValue={(meetings.data?.length ?? 0) + 1}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMeeting.isPending}>
                    {createMeeting.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Simpan Pertemuan
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <Dialog open={!!editMeeting} onOpenChange={(o) => !o && setEditMeeting(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Pertemuan</DialogTitle>
            <DialogDescription>Ubah judul, materi, atau urutan pertemuan.</DialogDescription>
          </DialogHeader>
          {editMeeting && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const parsed = meetingSchema.safeParse({
                  title: form.get("em_title"),
                  description: String(form.get("em_description") ?? "") || null,
                  order_index: Number(form.get("em_order")),
                });
                if (!parsed.success) {
                  toast.error(parsed.error.issues[0]!.message);
                  return;
                }
                updateMeeting.mutate({ ...parsed.data, id: editMeeting.id });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="em_title">Judul Pertemuan</Label>
                <Input
                  id="em_title"
                  name="em_title"
                  required
                  maxLength={150}
                  defaultValue={editMeeting.title}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em_description">Materi / Deskripsi</Label>
                <Textarea
                  id="em_description"
                  name="em_description"
                  maxLength={1000}
                  rows={3}
                  defaultValue={editMeeting.description ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em_order">Urutan</Label>
                <Input
                  id="em_order"
                  name="em_order"
                  type="number"
                  min={1}
                  max={200}
                  required
                  defaultValue={editMeeting.order_index}
                />
              </div>
              <Button type="submit" className="w-full" disabled={updateMeeting.isPending}>
                {updateMeeting.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>



      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Ujian</DialogTitle>
            <DialogDescription>
              {editExam?.classes?.name ?? className} • {editExam?.subjects?.name ?? subjectName} •{" "}
              {meetingName}
            </DialogDescription>
          </DialogHeader>
          {editExam && (
            <form key={editExam.id} onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Judul Ujian</Label>
                <Input
                  id="edit-title"
                  name="title"
                  required
                  maxLength={150}
                  defaultValue={editExam.title}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Deskripsi</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  maxLength={1000}
                  rows={3}
                  defaultValue={editExam.description ?? ""}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-duration_minutes">Durasi (menit)</Label>
                  <Input
                    id="edit-duration_minutes"
                    name="duration_minutes"
                    type="number"
                    min={1}
                    max={600}
                    defaultValue={editExam.duration_minutes}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-max_attempts">Batas pengerjaan (kali)</Label>
                  <Input
                    id="edit-max_attempts"
                    name="max_attempts"
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={editExam.max_attempts ?? 1}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-score_policy">Nilai yang diambil</Label>
                  <select
                    id="edit-score_policy"
                    name="score_policy"
                    defaultValue={editExam.score_policy ?? "highest"}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="highest">Nilai tertinggi</option>
                    <option value="latest">Nilai terakhir</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-start_at">Mulai</Label>
                  <Input
                    id="edit-start_at"
                    name="start_at"
                    type="datetime-local"
                    defaultValue={toDateTimeLocal(editExam.start_at)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end_at">Selesai</Label>
                  <Input
                    id="edit-end_at"
                    name="end_at"
                    type="datetime-local"
                    defaultValue={toDateTimeLocal(editExam.end_at)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateExam.isPending}>
                {updateExam.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <BrowserBreadcrumb
        rootLabel="Semua Kelas"
        className={classId ? className : undefined}
        subjectName={pickedSubject ? subjectName : undefined}
        meetingName={ready ? meetingName : undefined}
        onRoot={() => {
          setClassId(null);
          setSubjectId(null);
          setMeetingId(null);
        }}
        onClass={() => {
          setSubjectId(null);
          setMeetingId(null);
        }}
        onSubject={() => setMeetingId(null)}
      />

      {!classId && <ClassGrid onSelect={(id) => setClassId(id)} />}

      {classId && !subjectId && (
        <div className="mb-6">
          <StudentEnrollment classId={classId} className={className} userId={userId} />
        </div>
      )}

      {classId && !subjectId && <SubjectGrid classId={classId} onSelect={(id) => setSubjectId(id)} />}


      {pickedSubject && !meetingId && (

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Pilih Pertemuan</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(meetings.data ?? []).map((meeting) => (
              <div
                key={meeting.id}
                className="group rounded-xl border bg-card p-5 shadow-soft transition hover:border-primary"
              >
                <button
                  type="button"
                  onClick={() => setMeetingId(meeting.id)}
                  className="w-full text-left"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 font-display text-sm font-bold text-primary">
                    {meeting.order_index}
                  </span>
                  <p className="mt-3 font-display text-base font-semibold">{meeting.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {meeting.description || "Tanpa deskripsi"}
                  </p>
                </button>
                <div className="mt-4 flex items-center justify-between">
                  <Button size="sm" variant="outline" onClick={() => setMeetingId(meeting.id)}>
                    Buka Pertemuan
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit pertemuan"
                      onClick={() =>
                        setEditMeeting({
                          id: meeting.id,
                          title: meeting.title,
                          description: meeting.description,
                          order_index: meeting.order_index,
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Hapus pertemuan"
                      onClick={() => {
                        if (confirm(`Hapus "${meeting.title}" beserta seluruh kuis di dalamnya?`))
                          removeMeeting.mutate(meeting.id);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

              </div>
            ))}
          </div>
          {meetings.isSuccess && (meetings.data ?? []).length === 0 && (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Belum ada pertemuan untuk {className} — {subjectName}. Klik “Pertemuan Baru” untuk
              memulai.
            </div>
          )}
        </section>
      )}



      <div className="grid gap-4">
        {ready &&
          (exams.data ?? []).map((exam) => (
            <div
              key={exam.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-soft"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">{exam.title}</h2>
                  <Badge variant={exam.is_published ? "default" : "secondary"}>
                    {exam.is_published ? "Terbit" : "Draf"}
                  </Badge>
                  {exam.classes?.name && <Badge variant="outline">{exam.classes.name}</Badge>}
                  {exam.subjects?.name && <Badge variant="outline">{exam.subjects.name}</Badge>}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {exam.description || "Tanpa deskripsi"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Durasi {exam.duration_minutes} menit
                  {exam.start_at && ` • Mulai ${new Date(exam.start_at).toLocaleString("id-ID")}`}
                  {exam.end_at && ` • Selesai ${new Date(exam.end_at).toLocaleString("id-ID")}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Switch
                    id={`pub-${exam.id}`}
                    checked={exam.is_published}
                    onCheckedChange={(value) => togglePublish.mutate({ id: exam.id, value, title: exam.title })}
                  />
                  <Label htmlFor={`pub-${exam.id}`} className="text-xs">
                    Terbitkan
                  </Label>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/exams/$examId" params={{ examId: exam.id }}>
                    <ClipboardList className="mr-2 size-4" /> Soal
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/exams/$examId/hasil" params={{ examId: exam.id }}>
                    <BarChart3 className="mr-2 size-4" /> Hasil
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditExam(exam as ExamRow);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Hapus ujian "${exam.title}" beserta soal dan hasilnya?`))
                      removeExam.mutate(exam.id);
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        {ready && exams.isSuccess && (exams.data ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Belum ada kuis di {meetingName}. Klik “Kuis / Ujian Baru” untuk memulai.
          </div>
        )}
      </div>
    </AppShell>
  );
}
