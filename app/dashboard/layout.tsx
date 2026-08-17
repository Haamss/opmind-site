"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import DashboardSidebar from "./_components/Sidebar";
import { UpgradeCta } from "../../components/dashboard/planError";
import { fmtDot } from "../../components/dashboard/format";

type LayoutProfile = {
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  email?: string | null;
};

/**
 * Palier d'abonnement, lu depuis la vue public.instructor_plan_status.
 *
 * Aucun plafond ni aucune date n'est recalculé côté client : max_shooters NULL
 * = illimité, plan_expired est arbitré en base. Pas de ligne dans la vue (un
 * tireur, par exemple) = pas de bandeau.
 */
type LayoutPlan = {
  label: string | null;
  plan: string | null;
  plan_expired: boolean | null;
  plan_expires_at: string | null;
  max_shooters: number | null;
  shooter_count: number | null;
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
  const [plan, setPlan] = useState<LayoutPlan | null>(null);

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

      // Palier : source unique, aucun seuil en dur côté client.
      try {
        const { data: ps } = await sb
          .from("instructor_plan_status")
          .select(
            "label,plan,plan_expired,plan_expires_at,max_shooters,shooter_count"
          )
          .eq("instructor_id", userId)
          .maybeSingle();
        if (!cancelled && ps) setPlan(ps as LayoutPlan);
      } catch {
        /* ignore */
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
      <div style={{ marginLeft: 220, minHeight: "100vh" }}>
        <PlanBanner plan={plan} />
        {children}
      </div>
    </div>
  );
}

/* ──────────────  Bandeau de palier  ────────────── */

/**
 * Bandeau permanent : formule, quota, échéance.
 *
 * Les tokens du design system sont scopés sur `.page` : ce composant vit hors
 * de cette portée, d'où les couleurs littérales (comme le reste du layout).
 */
function PlanBanner({ plan }: { plan: LayoutPlan | null }) {
  if (!plan) return null;
  const expired = plan.plan_expired === true;
  const quota =
    plan.shooter_count == null
      ? null
      : `${plan.shooter_count} / ${
          plan.max_shooters == null ? "illimité" : plan.max_shooters
        } tireurs`;
  const accent = expired ? "#E84040" : "rgba(235,229,210,0.16)";

  return (
    <div
      role={expired ? "alert" : "status"}
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 14,
        padding: "10px 24px",
        borderBottom: `1px solid ${accent}`,
        background: expired ? "rgba(232,64,64,0.10)" : "transparent",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      <span style={{ fontWeight: 700, color: expired ? "#E84040" : "#ebe5d2" }}>
        {plan.label ?? plan.plan ?? "Formule"}
      </span>
      {quota && (
        <span style={{ color: "rgba(235,229,210,0.65)" }}>{quota}</span>
      )}
      {plan.plan_expires_at && (
        <span style={{ color: expired ? "#E84040" : "rgba(235,229,210,0.45)" }}>
          {expired ? "Expirée le" : "Jusqu'au"}{" "}
          {fmtDot(plan.plan_expires_at, true)}
        </span>
      )}
      {expired && (
        <span
          style={{
            color: "rgba(235,229,210,0.65)",
            textTransform: "none",
            letterSpacing: "0.06em",
            fontSize: 11,
          }}
        >
          Validation suspendue. Vos tireurs et leurs données sont conservés.
        </span>
      )}
      {expired && (
        <span style={{ marginLeft: "auto" }}>
          <UpgradeCta label="Passer au palier supérieur" />
        </span>
      )}
    </div>
  );
}
