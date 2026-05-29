"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import DashboardSidebar from "./_components/Sidebar";

type LayoutProfile = {
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  email?: string | null;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<LayoutProfile | null>(null);
  const [counts, setCounts] = useState<{
    stages: number;
    sessions: number;
    shooters: number;
  }>({ stages: 0, sessions: 0, shooters: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      const userId = data.session.user.id;
      const userEmail = data.session.user.email ?? null;

      setReady(true);

      try {
        const { data: prof } = await sb
          .from("profiles")
          .select("first_name,last_name,role,email")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (prof) {
          const p = prof as LayoutProfile;
          setProfile({ ...p, email: p.email ?? userEmail });
        } else {
          setProfile({ email: userEmail });
        }
      } catch {
        if (!cancelled) setProfile({ email: userEmail });
      }

      const safeCount = async (
        table: string,
        col: string,
        value: string
      ): Promise<number> => {
        try {
          const { count } = await sb
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq(col, value);
          return count || 0;
        } catch {
          return 0;
        }
      };

      const [stagesCount, sessionsCount, shootersCount] = await Promise.all([
        safeCount("stages", "user_id", userId),
        safeCount("sessions", "user_id", userId),
        safeCount("instructor_shooters", "instructor_id", userId),
      ]);
      if (cancelled) return;
      setCounts({
        stages: stagesCount,
        sessions: sessionsCount,
        shooters: shootersCount,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0a0a0c",
          color: "#ebe5d2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          opacity: 0.5,
        }}
      >
        Vérification...
      </main>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0c" }}>
      <DashboardSidebar
        profile={profile}
        stagesCount={counts.stages}
        sessionsCount={counts.sessions}
        shootersCount={counts.shooters}
      />
      <div style={{ marginLeft: 220, minHeight: "100vh" }}>{children}</div>
    </div>
  );
}
