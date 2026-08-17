import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "exam_published"
  | "exam_unpublished"
  | "exam_created"
  | "exam_updated"
  | "grade_updated";

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  exam_published: "Menerbitkan ujian",
  exam_unpublished: "Menarik ujian dari terbit",
  exam_created: "Membuat ujian",
  exam_updated: "Memperbarui ujian",
  grade_updated: "Memperbarui nilai",
};

export const AUDIT_ENTITY_LABEL: Record<string, string> = {
  exam: "Ujian",
  attempt: "Percobaan Ujian",
  answer: "Jawaban",
};

export type AuditInput = {
  action: AuditAction;
  entityType: "exam" | "attempt" | "answer";
  entityId?: string | null;
  entityLabel?: string | null;
  details?: Record<string, unknown>;
  actorName?: string | null;
  actorRole?: string | null;
};

/** Catat aktivitas guru/admin. Kegagalan pencatatan tidak boleh menggagalkan aksi utama. */
export async function logAudit(input: AuditInput) {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    await supabase.from("audit_logs").insert({
      actor_id: userId,
      actor_name: input.actorName || "Pengguna",
      actor_role: input.actorRole || "guru",
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      details: (input.details ?? {}) as never,
    });
  } catch {
    // diabaikan dengan sengaja
  }
}
