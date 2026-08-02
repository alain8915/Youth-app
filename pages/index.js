import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return router.replace("/login");
      const role = session.user.app_metadata?.role;
      router.replace(role === "admin" ? "/admin" : "/dashboard");
    });
  }, [router]);

  return null;
}
