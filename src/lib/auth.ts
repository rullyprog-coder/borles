import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "guru" | "siswa";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export function useCurrentUser() {
  const { session, loading } = useSession();
  const userId = session?.user.id;

  const profileQuery = useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      const list = (roles ?? []).map((r) => r.role as AppRole);
      const role: AppRole = list.includes("admin")
        ? "admin"
        : list.includes("guru")
          ? "guru"
          : "siswa";
      return { profile, roles: list, role };
    },
  });

  return {
    session,
    userId,
    loading: loading || (!!userId && profileQuery.isLoading),
    profile: profileQuery.data?.profile ?? null,
    role: (profileQuery.data?.role ?? null) as AppRole | null,
    isStaff: profileQuery.data?.role === "admin" || profileQuery.data?.role === "guru",
    isAdmin: profileQuery.data?.role === "admin",
  };
}

export function roleLabel(role: AppRole | null) {
  if (role === "admin") return "Administrator";
  if (role === "guru") return "Guru";
  if (role === "siswa") return "Siswa";
  return "-";
}
