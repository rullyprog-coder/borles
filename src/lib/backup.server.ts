/** Helper khusus server untuk fitur backup & restore. */

export type StorageClient = {
  from: (bucket: string) => {
    list: (
      prefix: string,
      opts: { limit: number; offset: number },
    ) => Promise<{
      data:
        | {
            name: string;
            id: string | null;
            metadata: Record<string, unknown> | null;
          }[]
        | null;
      error: { message: string } | null;
    }>;
    download: (path: string) => Promise<{ data: Blob | null; error: { message: string } | null }>;
    upload: (
      path: string,
      body: ArrayBuffer | Uint8Array,
      opts: { upsert: boolean; contentType?: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

export async function assertAdmin(
  supabase: {
    rpc: (fn: "is_admin", args: { _user_id: string }) => Promise<{ data: unknown; error: unknown }>;
  },
  userId: string,
) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error) throw new Error("Gagal memeriksa peran pengguna.");
  if (!data) throw new Error("Hanya administrator yang dapat mengelola backup.");
}

/** Menelusuri seluruh berkas dalam bucket secara rekursif. */
export async function listBucketFiles(
  storage: StorageClient,
  bucket: string,
  prefix = "",
): Promise<{ path: string; size: number }[]> {
  const files: { path: string; size: number }[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: 100, offset });
    if (error) throw new Error(`Gagal membaca berkas di ${bucket}: ${error.message}`);
    const entries = data ?? [];
    for (const entry of entries) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null && entry.metadata === null) {
        files.push(...(await listBucketFiles(storage, bucket, full)));
      } else {
        const size = Number((entry.metadata?.["size"] as number | undefined) ?? 0);
        files.push({ path: full, size });
      }
    }
    if (entries.length < 100) break;
    offset += entries.length;
  }
  return files;
}

export function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
