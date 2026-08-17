import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DbStatus = "checking" | "online" | "offline";

/** Memantau koneksi ke database (Lovable Cloud) untuk indikator di header. */
export function useDbStatus(intervalMs = 30_000) {
  const [status, setStatus] = useState<DbStatus>("checking");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function ping() {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (active) {
          setStatus("offline");
          setCheckedAt(new Date());
        }
        return;
      }
      try {
        const { error } = await supabase
          .from("classes")
          .select("id", { count: "exact", head: true });
        if (!active) return;
        setStatus(error ? "offline" : "online");
      } catch {
        if (active) setStatus("offline");
      }
      if (active) setCheckedAt(new Date());
    }

    void ping();
    timer = setInterval(() => void ping(), intervalMs);
    const onOnline = () => void ping();
    const onOffline = () => setStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [intervalMs]);

  return { status, checkedAt };
}
