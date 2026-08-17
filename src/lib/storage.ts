import { supabase } from "@/integrations/supabase/client";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function validateFile(file: File, allowed: string[] = ALLOWED_UPLOAD_TYPES): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return "Ukuran berkas maksimal 5MB.";
  if (!allowed.includes(file.type)) return "Tipe berkas tidak diizinkan (PDF, JPG, PNG, DOCX).";
  return null;
}

export function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
