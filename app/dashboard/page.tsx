"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import { ROLE_OPTIONS, isShooterRole } from "../../lib/roles";

/* ──────────────  Types  ────────────── */

type Profile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  email?: string | null;
  club?: string | null;
};

type Stage = {
  id: string;
  name: string;
  type?: string | null;
  shots?: number | null;
  created_at?: string | null;
  stage_type?: string | null;
  difficulty?: string | null;
  hf_best?: number | null;
  runs_count?: number | null;
  is_favorite?: boolean | null;
  diagram_data?: unknown;
  code?: string | null;
  targets?: number | null;
  distance_m?: number | null;
  last_run_at?: string | null;
};

type SessionWarmup = { duration?: number | null; exercises?: string | null };
type SessionBlock = {
  name?: string | null;
  shots?: number | null;
  objective?: string | null;
  notes?: string | null;
};
type SessionCooldown = { duration?: number | null; notes?: string | null };

type MagazineConfig = { rounds: number };
type TargetType =
  | "rings"
  | "silhouette"
  | "plates"
  | "none"
  | "silhouette_police";

type Session = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  type?: string | null;
  date?: string | null;
  created_at?: string | null;
  // CustomSession fields (aligned with mobile app)
  objective?: string | null;
  instructions?: string | null;
  rounds?: number | null;
  magazines?: MagazineConfig[] | null;
  dry_fire?: boolean | null;
  use_timer?: boolean | null;
  tags?: string[] | null;
  target_type?: TargetType | null;
  distance_m?: number | null;
  stand?: string | null;
  coach_mode?: boolean | null;
  coach_shooter_ids?: string[] | null;
  caliber?: string | null;
  grains?: string | null;
  power_factor?: number | null;
  equipment?: string[] | null;
  weather?: string | null;
  lighting?: string | null;
  physical_state?: string | null;
  context_notes?: string | null;
  hf_best?: number | null;
  status?: string | null;
  // Legacy fields (preserved for older rows)
  weapon?: string | null;
  shots_fired?: number | null;
  total_shots?: number | null;
  warmup?: SessionWarmup | null;
  blocks?: SessionBlock[] | null;
  cooldown?: SessionCooldown | null;
};

type View =
  | "create_session"
  | "home"
  | "stages"
  | "sessions"
  | "performance"
  | "shooters"
  | "profile"
  | "settings";

/* ──────────────  Page  ────────────── */

const VIEW_VALUES: View[] = [
  "create_session",
  "home",
  "stages",
  "sessions",
  "performance",
  "profile",
  "settings",
];

function parseViewParam(v: string | null | undefined): View {
  if (v && (VIEW_VALUES as string[]).includes(v)) return v as View;
  return "home";
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlView = parseViewParam(searchParams?.get("view"));
  const [view, setView] = useState<View>(urlView);

  // URL → state sync (sidebar links update URL, this picks it up)
  useEffect(() => {
    setView(urlView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlView]);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stagesCount, setStagesCount] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [ammoCount, setAmmoCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (cancelled) return;
      if (!session) {
        router.push("/login");
        return;
      }

      const userId = session.user.id;
      const userEmail = session.user.email ?? "";

      let prof: Profile = { id: userId, email: userEmail };
      try {
        const { data, error } = await sb
          .from("profiles")
          .select("first_name,last_name,role,email,club")
          .eq("id", userId)
          .maybeSingle();
        if (!error && data) {
          prof = { ...data, id: userId, email: data.email ?? userEmail };
        }
      } catch {
        // profile table missing — fall back to auth user
      }
      if (cancelled) return;
      setProfile(prof);

      // stages
      try {
        const { count } = await sb
          .from("stages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        if (!cancelled && typeof count === "number") setStagesCount(count);
        const { data: stageRows } = await sb
          .from("stages")
          .select("id,name,type,shots,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (!cancelled && Array.isArray(stageRows)) {
          setStages(stageRows as Stage[]);
        }
      } catch {
        // stages table missing — leave empty
      }

      // sessions (lues depuis module_sessions — séances réelles de l'app)
      try {
        const { count } = await sb
          .from("module_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        if (!cancelled && typeof count === "number") setSessionsCount(count);
        const { data: sessionRows } = await sb
          .from("module_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(200);
        if (!cancelled && Array.isArray(sessionRows)) {
          // Remap colonnes module_sessions → noms legacy attendus par les
          // calculs KPI/filtres (hfMoyen, filterAndSortSessions, sparklines…).
          const rows = (sessionRows as Record<string, unknown>[]).map((r) => ({
            ...r,
            hf_best: r.hit_factor,
            dry_fire: r.is_dry_fire,
            name: r.session_title,
          })) as unknown as Session[];
          setSessions(rows);
          const total = rows.reduce(
            (s, x) => s + (Number(x.total_shots) || Number(x.shots_fired) || 0),
            0
          );
          setAmmoCount(total);
        }
      } catch {
        // sessions table missing — leave empty
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onLogout() {
    await getSupabase().auth.signOut();
    router.push("/login");
  }

  async function onDeleteStage(stageId: string) {
    if (!window.confirm("Supprimer ce stage ?")) return;
    try {
      const sb = getSupabase();
      await sb.from("stages").delete().eq("id", stageId);
      setStages((prev) => prev.filter((s) => s.id !== stageId));
      setStagesCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  async function onDeleteSession(sessionId: string) {
    if (!window.confirm("Supprimer cette session ?")) return;
    try {
      const sb = getSupabase();
      await sb.from("module_sessions").delete().eq("id", sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionsCount((c) => Math.max(0, c - 1));
      const removed = sessions.find((s) => s.id === sessionId);
      const removedShots =
        Number(removed?.total_shots) || Number(removed?.shots_fired) || 0;
      setAmmoCount((c) => Math.max(0, c - removedShots));
    } catch {
      // ignore
    }
  }

  function startEditSession(s: Session) {
    setEditingSession(s);
    setView("create_session");
  }

  function selectView(v: View) {
    if (v === "create_session") setEditingSession(null);
    setView(v);
    const url = v === "home" ? "/dashboard" : `/dashboard?view=${v}`;
    router.replace(url, { scroll: false });
  }

  function onSessionSaved(saved: Session, isUpdate: boolean) {
    if (isUpdate) {
      const next = sessions.map((x) =>
        x.id === saved.id ? { ...x, ...saved } : x
      );
      setSessions(next);
      const total = next.reduce(
        (s, x) => s + (Number(x.total_shots) || Number(x.shots_fired) || 0),
        0
      );
      setAmmoCount(total);
    } else {
      const next = [saved, ...sessions];
      setSessions(next);
      setSessionsCount((c) => c + 1);
      const total = next.reduce(
        (s, x) => s + (Number(x.total_shots) || Number(x.shots_fired) || 0),
        0
      );
      setAmmoCount(total);
    }
  }

  const streak = computeStreak(sessions);
  const firstName = (profile?.first_name || "").trim();

  if (loading) {
    return <FullStatus text="Chargement..." />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0c",
        color: "#ebe5d2",
        fontFamily: "var(--font-barlow), system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Topbar
        profile={profile}
        onLogout={onLogout}
        setView={selectView}
        view={view}
      />

        <main
          style={{
            flex: 1,
            padding: "32px 40px",
            overflowY: "auto",
          }}
        >
          {view === "create_session" && (
            <CreateSessionView
              key={editingSession?.id ?? "new"}
              setView={setView}
              initialData={editingSession}
              editingId={editingSession?.id ?? null}
              onSessionSaved={onSessionSaved}
            />
          )}
          {view === "home" && (
            <HomeView
              firstName={firstName}
              profile={profile}
              stagesCount={stagesCount}
              sessionsCount={sessionsCount}
              ammoCount={ammoCount}
              streak={streak}
              stages={stages.slice(0, 5)}
              sessions={sessions}
              setView={selectView}
            />
          )}
          {view === "stages" && (
            <StagesView stages={stages} onDelete={onDeleteStage} />
          )}
          {view === "sessions" && (
            <SessionsView
              sessions={sessions}
              setView={selectView}
              onDelete={onDeleteSession}
              onEdit={startEditSession}
              isShooter={isShooterRole(profile?.role)}
            />
          )}
          {view === "performance" && (
            <PerformanceView sessions={sessions} stages={stages} />
          )}
          {view === "profile" && (
            <ProfileView profile={profile} setProfile={setProfile} />
          )}
          {view === "settings" && <Placeholder title="Paramètres" />}
        </main>
    </div>
  );
}

/* ──────────────  Sidebar  ────────────── */

function Sidebar({
  view,
  setView,
  canSeeShooters,
}: {
  view: View;
  setView: (v: View) => void;
  canSeeShooters: boolean;
}) {
  const items: { id: View; label: string; icon: ReactNode }[] = [
    { id: "create_session", label: "Créer une séance", icon: <IconPlus /> },
    { id: "home", label: "Tableau de bord", icon: <IconHome /> },
    { id: "stages", label: "Mes stages", icon: <IconTarget /> },
    { id: "sessions", label: "Sessions", icon: <IconTimer /> },
    { id: "performance", label: "Performance", icon: <IconChart /> },
  ];
  if (canSeeShooters) {
    items.push({ id: "shooters", label: "Mes tireurs", icon: <IconUsers /> });
  }
  items.push({ id: "profile", label: "Profil", icon: <IconUser /> });

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 240,
        background: "#0d0d12",
        borderRight: "1px solid rgba(235,229,210,0.06)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
      }}
    >
      <div style={{ padding: "20px 24px" }}>
        <OpMindLogo />
      </div>

      <nav style={{ flex: 1, marginTop: 12 }}>
        {items.map((it) => (
          <SidebarItem
            key={it.id}
            active={view === it.id}
            onClick={() => setView(it.id)}
            icon={it.icon}
            label={it.label}
          />
        ))}
      </nav>

      <div style={{ paddingBottom: 12 }}>
        <SidebarItem
          active={view === "settings"}
          onClick={() => setView("settings")}
          icon={<IconCog />}
          label="Paramètres"
        />
      </div>
    </aside>
  );
}

function SidebarItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: active ? "rgba(235,229,210,0.04)" : "transparent",
        color: active ? "#ebe5d2" : "rgba(235,229,210,0.55)",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        border: "none",
        borderLeft: `2px solid ${active ? "#7A0000" : "transparent"}`,
        cursor: "pointer",
        textAlign: "left",
        transition: "color .15s, background .15s",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          width: 16,
          height: 16,
          alignItems: "center",
          justifyContent: "center",
          color: active ? "#7A0000" : "rgba(235,229,210,0.45)",
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

/* ──────────────  Topbar  ────────────── */

function Topbar({
  profile,
  onLogout,
  setView,
  view,
}: {
  profile: Profile | null;
  onLogout: () => void;
  setView: (v: View) => void;
  view: View;
}) {
  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.email ||
    "Utilisateur";
  // Le tireur crée ses séances depuis l'app (écriture web = table legacy).
  const isShooter = isShooterRole(profile?.role);
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        height: 48,
        background: "#0d0d12",
        borderBottom: "1px solid rgba(235,229,210,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "0 16px 0 24px",
        zIndex: 5,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.45)",
            flexShrink: 0,
          }}
        >
          DASHBOARD
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.45)",
            flexShrink: 0,
          }}
        >
          Aujourd&apos;hui · {dd} · {mm} · {yy}
        </span>
        <div
          style={{
            position: "relative",
            flex: 1,
            maxWidth: 360,
            minWidth: 0,
          }}
        >
          <input
            type="text"
            placeholder="Rechercher séance, drill, tireur..."
            readOnly
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid rgba(235,229,210,0.1)",
              color: "rgba(235,229,210,0.65)",
              padding: "6px 40px 6px 10px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              letterSpacing: "0.04em",
              outline: "none",
              cursor: "text",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "rgba(235,229,210,0.4)",
              border: "1px solid rgba(235,229,210,0.16)",
              padding: "1px 6px",
              pointerEvents: "none",
            }}
          >
            ⌘K
          </span>
        </div>
        {!isShooter && (
          <button
            type="button"
            onClick={() => setView("create_session")}
            style={{
              background: "#7A0000",
              color: "#fff",
              border: "none",
              padding: "8px 14px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            + Créer une séance
          </button>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexShrink: 0,
        }}
      >
        {view === "performance" && (
          <>
            <button
              type="button"
              style={{
                background: "transparent",
                border: "1px solid rgba(235,229,210,0.16)",
                color: "rgba(235,229,210,0.65)",
                padding: "6px 12px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Exporter rapport
            </button>
            <button
              type="button"
              style={{
                background: "transparent",
                border: "1px solid rgba(235,229,210,0.16)",
                color: "rgba(235,229,210,0.65)",
                padding: "6px 12px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Partager au coach
            </button>
          </>
        )}
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#ebe5d2",
          }}
        >
          {name}
        </span>
        <button
          type="button"
          onClick={onLogout}
          style={{
            background: "transparent",
            border: "1px solid rgba(235,229,210,0.16)",
            color: "rgba(235,229,210,0.55)",
            padding: "6px 12px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#ebe5d2";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "#7A0000";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(235,229,210,0.55)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(235,229,210,0.16)";
          }}
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}

/* ──────────────  Home view  ────────────── */

function HomeView({
  firstName,
  profile,
  stagesCount,
  sessionsCount,
  ammoCount,
  streak,
  stages,
  sessions,
  setView,
}: {
  firstName: string;
  profile: Profile | null;
  stagesCount: number;
  sessionsCount: number;
  ammoCount: number;
  streak: number;
  stages: Stage[];
  sessions: Session[];
  setView: (v: View) => void;
}) {
  const now = new Date();
  const weekNum = isoWeek(now);
  const lastInitial = (profile?.last_name || "").trim().charAt(0).toUpperCase();

  const thisWeekCount = sessionsThisWeekCount(sessions);
  const sortedSessions = [...sessions].sort((a, b) => {
    const da = new Date(a.date || a.created_at || 0).getTime();
    const db = new Date(b.date || b.created_at || 0).getTime();
    return db - da;
  });
  const lastSession = sortedSessions[0];
  const lastStand =
    typeof lastSession?.stand === "string" && lastSession.stand.trim()
      ? lastSession.stand
      : "—";
  const lastWeatherLbl = weatherLabel(lastSession?.weather);
  const lastDistance = lastSession?.distance_m;
  const conditionsStr =
    [
      lastWeatherLbl,
      lastDistance != null && lastDistance > 0 ? `${lastDistance} m` : "",
    ]
      .filter(Boolean)
      .join(" · ") || "—";
  const roStr =
    [firstName, lastInitial ? `${lastInitial}.` : ""].filter(Boolean).join(" ") ||
    "—";

  const sessionsPerDay = sessionsPerDay7(sessions);
  const ammoPerWeek = ammoLast8Weeks(sessions);
  const streakDays = sessionsLast7DaysBool(sessions);

  const nextMilestone = streak > 0 ? Math.ceil((streak + 1) / 7) * 7 : 7;
  const daysToMilestone = Math.max(1, nextMilestone - streak);

  const recentSessions = sortedSessions.slice(0, 5);

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 32,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.45)",
            }}
          >
            Tableau de bord · Semaine {weekNum}
          </div>
          <h1
            style={{
              margin: "12px 0 0 0",
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(56px, 8vw, 96px)",
              fontWeight: 700,
              color: "#ebe5d2",
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              lineHeight: 0.95,
            }}
          >
            Bonjour,
            <br />
            <span style={{ color: "#7A0000", fontStyle: "italic" }}>
              {firstName || "shooter"}.
            </span>
          </h1>
          <div
            style={{
              marginTop: 16,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 13,
              lineHeight: 1.6,
              letterSpacing: "0.02em",
              color: "rgba(235,229,210,0.65)",
            }}
          >
            <span style={{ color: "#7A0000", fontWeight: 700 }}>
              {thisWeekCount}
            </span>{" "}
            séance{thisWeekCount > 1 ? "s" : ""} cette semaine ·{" "}
            <span style={{ color: "#7A0000", fontWeight: 700 }}>
              {ammoCount}
            </span>{" "}
            cartouches tirées.{" "}
            <span style={{ color: "#7A0000", fontWeight: 700 }}>
              Streak active
            </span>{" "}
            de {streak} jour{streak > 1 ? "s" : ""}.
          </div>
        </div>
        <NextStandCard
          hour="—"
          lieu={lastStand}
          ro={roStr}
          conditions={conditionsStr}
        />
      </div>

      {/* 4 KPI cards */}
      <div
        style={{
          marginTop: 48,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <KpiCard
          label="Stages créés"
          value={String(stagesCount)}
          badge={stagesCount > 0 ? `${stagesCount} TOTAL` : "—"}
          spark={
            <Sparkline
              kind="line"
              data={
                stagesCount > 0 ? [0, 0, 0, 0, 0, 0, stagesCount] : [0, 0, 0, 0, 0, 0, 0]
              }
            />
          }
        />
        <KpiCard
          label="Sessions"
          value={String(sessionsCount)}
          badge={
            thisWeekCount > 0
              ? `+${thisWeekCount} CETTE SEM.`
              : `SEM. ${weekNum}`
          }
          badgeColor={thisWeekCount > 0 ? "#5ad99b" : undefined}
          spark={<Sparkline kind="line" data={sessionsPerDay} />}
        />
        <KpiCard
          label="Cartouches tirées"
          value={String(ammoCount)}
          badge={`SEM. ${weekNum}`}
          spark={<Sparkline kind="bars" data={ammoPerWeek} />}
        />
        <KpiCard
          label="Streak"
          value={`${streak} ${streak > 1 ? "JOURS" : "JOUR"}`}
          badge={streak > 0 ? "ACTIVE" : "INACTIVE"}
          badgeColor={streak > 0 ? "#5ad99b" : undefined}
          sub={`Prochain palier · ${daysToMilestone} jour${daysToMilestone > 1 ? "s" : ""}`}
          spark={<SparklineDots data={streakDays} />}
        />
      </div>

      {/* Activité récente */}
      <Section title="Activité récente">
        {recentSessions.length === 0 ? (
          <EmptyRow>Aucune session enregistrée.</EmptyRow>
        ) : (
          <Table
            headers={["Nom", "Type", "Coups", "Date"]}
            rows={recentSessions.map((s) => {
              const shots =
                s.total_shots != null
                  ? s.total_shots
                  : s.shots_fired != null
                    ? s.shots_fired
                    : "—";
              const typ = s.dry_fire
                ? "DRY FIRE"
                : (s.type || "—").toUpperCase();
              return [
                s.name || "—",
                typ,
                String(shots),
                formatDate(s.date || s.created_at),
              ];
            })}
          />
        )}
      </Section>

      {/* Quick actions */}
      <div
        style={{
          marginTop: 32,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        {!isShooterRole(profile?.role) && (
          <QuickAction
            title="Créer une séance"
            subtitle="Drill builder · Export app"
            onClick={() => setView("create_session")}
          />
        )}
        <QuickAction
          title="Importer une cible"
          subtitle="PDF parsing · Bientôt"
          disabled
        />
      </div>

      {/* Stages récents (préservé) */}
      {stages.length > 0 && (
        <Section title="Mes stages récents">
          <Table
            headers={["Nom", "Type", "Coups", "Date"]}
            rows={stages.map((s) => [
              s.name || "—",
              (s.type || "—").toUpperCase(),
              s.shots != null ? String(s.shots) : "—",
              formatDate(s.created_at),
            ])}
          />
        </Section>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#131318",
        border: "1px solid rgba(235,229,210,0.08)",
        padding: 24,
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.55)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-barlow-condensed), system-ui, sans-serif",
          fontSize: 36,
          fontWeight: 700,
          color: "#ebe5d2",
          marginTop: 12,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  badge,
  badgeColor,
  sub,
  spark,
}: {
  label: string;
  value: string;
  badge?: string;
  badgeColor?: string;
  sub?: string;
  spark?: ReactNode;
}) {
  return (
    <div
      style={{
        background: "#0d0d12",
        border: "1px solid rgba(235,229,210,0.06)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 140,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.55)",
          }}
        >
          {label}
        </span>
        {badge && (
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: badgeColor || "rgba(235,229,210,0.55)",
              border: `1px solid ${badgeColor || "rgba(235,229,210,0.16)"}`,
              padding: "2px 6px",
              whiteSpace: "nowrap",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 48,
          fontWeight: 700,
          color: "#ebe5d2",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {sub ? (
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.45)",
            }}
          >
            {sub}
          </span>
        ) : (
          <span />
        )}
        {spark && (
          <span style={{ display: "inline-flex", flexShrink: 0 }}>
            {spark}
          </span>
        )}
      </div>
    </div>
  );
}

function Sparkline({
  data,
  kind = "line",
  color = "#7A0000",
}: {
  data: number[];
  kind?: "line" | "bars";
  color?: string;
}) {
  const W = 60;
  const H = 24;
  const max = Math.max(1, ...data);
  if (kind === "bars") {
    const barW = data.length > 0 ? W / data.length : W;
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        {data.map((v, i) => {
          const h = max > 0 ? (v / max) * (H - 2) : 0;
          return (
            <rect
              key={i}
              x={i * barW + 0.5}
              y={H - h - 1}
              width={Math.max(1, barW - 1)}
              height={Math.max(1, h)}
              fill={v === 0 ? "rgba(235,229,210,0.12)" : color}
            />
          );
        })}
      </svg>
    );
  }
  if (data.length === 0) {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <line
          x1={0}
          y1={H / 2}
          x2={W}
          y2={H / 2}
          stroke="rgba(235,229,210,0.16)"
          strokeWidth="1"
        />
      </svg>
    );
  }
  const points = data.map((v, i) => {
    const x = data.length === 1 ? W / 2 : (i / (data.length - 1)) * W;
    const y = H - 2 - (v / max) * (H - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparklineDots({
  data,
  color = "#7A0000",
}: {
  data: boolean[];
  color?: string;
}) {
  const W = 60;
  const H = 24;
  const tileW = data.length > 0 ? W / data.length : W;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      {data.map((on, i) => (
        <rect
          key={i}
          x={i * tileW + 0.5}
          y={4}
          width={Math.max(1, tileW - 1)}
          height={H - 8}
          fill={on ? color : "rgba(235,229,210,0.12)"}
        />
      ))}
    </svg>
  );
}

function NextStandCard({
  hour,
  lieu,
  ro,
  conditions,
}: {
  hour: string;
  lieu: string;
  ro: string;
  conditions: string;
}) {
  return (
    <aside
      style={{
        background: "#131318",
        border: "1px solid rgba(235,229,210,0.08)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        Prochain stand
      </span>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 32,
          fontWeight: 700,
          color: "#ebe5d2",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {hour}
      </span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 4,
        }}
      >
        <NextStandRow label="Lieu" value={lieu} />
        <NextStandRow label="RO" value={ro} />
        <NextStandRow label="Conditions" value={conditions} />
      </div>
    </aside>
  );
}

function NextStandRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "#ebe5d2",
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function QuickAction({
  title,
  subtitle,
  onClick,
  disabled = false,
}: {
  title: string;
  subtitle: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "#131318",
        border: "1px solid rgba(235,229,210,0.08)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        textAlign: "left",
        transition: "border-color .15s",
      }}
    >
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 18,
          fontWeight: 700,
          color: "#ebe5d2",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        {subtitle}
      </span>
    </button>
  );
}

function isoWeek(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function sessionsThisWeekCount(sessions: Session[]): number {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);
  return sessions.filter((s) => {
    const d = new Date(s.date || s.created_at || "");
    return !isNaN(d.getTime()) && d >= monday;
  }).length;
}

function sessionsPerDay7(sessions: Session[]): number[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    counts.push(
      sessions.filter(
        (s) => (s.date || s.created_at || "").slice(0, 10) === key
      ).length
    );
  }
  return counts;
}

function ammoLast8Weeks(sessions: Session[]): number[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const buckets = new Array(8).fill(0);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  for (const s of sessions) {
    const d = new Date(s.date || s.created_at || "");
    if (isNaN(d.getTime())) continue;
    const weeksAgo = Math.floor((now.getTime() - d.getTime()) / msPerWeek);
    if (weeksAgo >= 0 && weeksAgo < 8) {
      const idx = 7 - weeksAgo;
      buckets[idx] +=
        Number(s.total_shots) || Number(s.shots_fired) || 0;
    }
  }
  return buckets;
}

function sessionsLast7DaysBool(sessions: Session[]): boolean[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push(
      sessions.some(
        (s) => (s.date || s.created_at || "").slice(0, 10) === key
      )
    );
  }
  return result;
}

function weatherLabel(value: string | null | undefined): string {
  if (!value) return "";
  const opt = WEATHER_OPTIONS.find((o) => o.value === value);
  return opt?.label || "";
}

/* ──────────────  Stages view  ────────────── */

const FAVORITES_KEY = "opmind-favorite-stages";

const BIB_OFFICIELLE: Stage[] = [
  {
    id: "bib-cm-99-11",
    name: "Cooper M 99-11",
    code: "CM 99-11",
    stage_type: "ipsc",
    difficulty: "l2",
    shots: 12,
    targets: 4,
    distance_m: 10,
  },
  {
    id: "bib-eye-opener",
    name: "Eye-Opener",
    code: "EYE-OPENER",
    stage_type: "ipsc",
    difficulty: "l1",
    shots: 6,
    targets: 3,
    distance_m: 7,
  },
  {
    id: "bib-six-chickens",
    name: "Six Chickens",
    code: "SIX CHICKENS",
    stage_type: "classifier",
    difficulty: "l3",
    shots: 12,
    targets: 6,
    distance_m: 12,
  },
  {
    id: "bib-mozambique",
    name: "Mozambique",
    code: "MOZAMBIQUE",
    stage_type: "drill",
    difficulty: "l1",
    shots: 3,
    targets: 1,
    distance_m: 5,
  },
];

type StageKind = "ipsc" | "steel" | "drill" | "classifier";

function classifyStage(s: Stage): StageKind {
  const st = (s.stage_type || "").toLowerCase();
  if (st === "ipsc" || st === "steel" || st === "drill" || st === "classifier") {
    return st;
  }
  const t = (s.type || "").toLowerCase();
  if (t.includes("classifier")) return "classifier";
  if (t.includes("steel")) return "steel";
  if (t.includes("drill") || t === "speed" || t === "short") return "drill";
  return "ipsc";
}

function stageBadgeColor(kind: StageKind): string {
  switch (kind) {
    case "ipsc":
      return "#7A0000";
    case "steel":
      return "#f5a623";
    case "drill":
      return "#1a3a5c";
    case "classifier":
      return "#5ad99b";
  }
}

function stageBadgeLabel(s: Stage): string {
  const kind = classifyStage(s);
  const diff = (s.difficulty || "").toUpperCase();
  if (kind === "ipsc") return diff ? `IPSC·${diff}` : "IPSC";
  if (kind === "classifier") return diff ? `CLASSIFIER·${diff}` : "CLASSIFIER";
  if (kind === "drill") return "DRILL";
  if (kind === "steel") return "STEEL";
  return "STAGE";
}

function stageCode(s: Stage): string {
  if (s.code) return s.code;
  return s.id.slice(0, 8).toUpperCase();
}

type DiagramShape = { x: number; y: number; type: string };

function stageDiagramShapes(diagram: unknown): DiagramShape[] {
  if (!diagram || typeof diagram !== "object") return [];
  const d = diagram as { targets?: unknown };
  if (!Array.isArray(d.targets)) return [];
  return d.targets
    .map((t: unknown) => {
      const tt = (t || {}) as {
        x?: unknown;
        y?: unknown;
        type?: unknown;
      };
      return {
        x: Number(tt.x) || 0,
        y: Number(tt.y) || 0,
        type: typeof tt.type === "string" ? tt.type : "paper",
      };
    })
    .filter((t) => Number.isFinite(t.x) && Number.isFinite(t.y));
}

function sortStages(list: Stage[], sort: string): Stage[] {
  const arr = [...list];
  switch (sort) {
    case "recent":
      return arr.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    case "hf":
      return arr.sort((a, b) => (b.hf_best || 0) - (a.hf_best || 0));
    case "runs":
      return arr.sort((a, b) => (b.runs_count || 0) - (a.runs_count || 0));
    case "name":
      return arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    default:
      return arr;
  }
}

function isFavoriteStage(s: Stage, favIds: string[]): boolean {
  return !!s.is_favorite || favIds.includes(s.id);
}

function StagesView({
  stages,
  onDelete,
}: {
  stages: Stage[];
  onDelete: (id: string) => void;
}) {
  const [stageFilter, setStageFilter] = useState<
    "all" | "ipsc" | "steel" | "drills" | "classifiers" | "favorites"
  >("all");
  const [stageDifficulty, setStageDifficulty] = useState<
    "all" | "l1" | "l2" | "l3" | "l4" | "l5"
  >("all");
  const [stageSort, setStageSort] = useState<
    "recent" | "hf" | "runs" | "name"
  >("recent");
  const [stageView, setStageView] = useState<"grid" | "list">("grid");
  const [favoriteStages, setFavoriteStages] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavoriteStages(
            parsed.filter((x): x is string => typeof x === "string")
          );
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function toggleFavorite(id: string) {
    setFavoriteStages((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const counts = {
    all: stages.length,
    ipsc: stages.filter((s) => classifyStage(s) === "ipsc").length,
    steel: stages.filter((s) => classifyStage(s) === "steel").length,
    drills: stages.filter((s) => classifyStage(s) === "drill").length,
    classifiers: stages.filter((s) => classifyStage(s) === "classifier").length,
    favorites: stages.filter((s) => isFavoriteStage(s, favoriteStages)).length,
  };

  const now = new Date();
  const thisMonthRuns = stages.reduce((sum, s) => {
    const d = new Date(s.last_run_at || s.created_at || "");
    if (
      !isNaN(d.getTime()) &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    ) {
      return sum + (Number(s.runs_count) || 1);
    }
    return sum;
  }, 0);

  const filtered = stages.filter((s) => {
    if (stageFilter === "favorites" && !isFavoriteStage(s, favoriteStages))
      return false;
    if (stageFilter === "ipsc" && classifyStage(s) !== "ipsc") return false;
    if (stageFilter === "steel" && classifyStage(s) !== "steel") return false;
    if (stageFilter === "drills" && classifyStage(s) !== "drill") return false;
    if (
      stageFilter === "classifiers" &&
      classifyStage(s) !== "classifier"
    )
      return false;
    if (
      stageDifficulty !== "all" &&
      (s.difficulty || "").toLowerCase() !== stageDifficulty
    )
      return false;
    return true;
  });
  const sorted = sortStages(filtered, stageSort);

  const TABS: {
    key: typeof stageFilter;
    label: string;
    count: number;
  }[] = [
    { key: "all", label: "Tous", count: counts.all },
    { key: "ipsc", label: "IPSC", count: counts.ipsc },
    { key: "steel", label: "Steel", count: counts.steel },
    { key: "drills", label: "Drills", count: counts.drills },
    { key: "classifiers", label: "Classifiers", count: counts.classifiers },
    { key: "favorites", label: "Favoris", count: counts.favorites },
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 32,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.45)",
            }}
          >
            Module · Stage Builder
          </div>
          <h1
            style={{
              margin: "10px 0 0 0",
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(40px, 6vw, 72px)",
              fontWeight: 700,
              color: "#ebe5d2",
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              lineHeight: 0.95,
            }}
          >
            Mes{" "}
            <span style={{ color: "#7A0000", fontStyle: "italic" }}>
              stages.
            </span>
          </h1>
          <div
            style={{
              marginTop: 12,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              lineHeight: 1.6,
              letterSpacing: "0.02em",
              color: "rgba(235,229,210,0.65)",
              maxWidth: 640,
            }}
          >
            Bibliothèque de scénarios IPSC, classifiers et drills.{" "}
            <span style={{ color: "#ebe5d2", fontWeight: 700 }}>
              {counts.all}
            </span>{" "}
            stages dans ta collection ·{" "}
            <span style={{ color: "#ebe5d2", fontWeight: 700 }}>
              {thisMonthRuns}
            </span>{" "}
            tirés ce mois-ci.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            minWidth: 320,
          }}
        >
          <InlineKpi label="Total" value={counts.all} />
          <InlineKpi label="IPSC" value={counts.ipsc} />
          <InlineKpi label="Drills" value={counts.drills} />
          <InlineKpi label="Tirs ce mois" value={thisMonthRuns} />
        </div>
      </div>

      {/* Filter bar */}
      <div
        style={{
          marginTop: 32,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          paddingBottom: 12,
          borderBottom: "1px solid rgba(235,229,210,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const active = stageFilter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setStageFilter(t.key)}
                style={{
                  background: active ? "rgba(122,0,0,0.15)" : "transparent",
                  border: active
                    ? "1px solid #7A0000"
                    : "1px solid rgba(235,229,210,0.1)",
                  color: active ? "#ebe5d2" : "rgba(235,229,210,0.55)",
                  padding: "6px 12px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {t.label} ({t.count})
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <FilterSelect
            label="Difficulté"
            value={stageDifficulty}
            onChange={(v) =>
              setStageDifficulty(
                v as "all" | "l1" | "l2" | "l3" | "l4" | "l5"
              )
            }
            options={[
              { value: "all", label: "Toutes" },
              { value: "l1", label: "L1" },
              { value: "l2", label: "L2" },
              { value: "l3", label: "L3" },
              { value: "l4", label: "L4" },
              { value: "l5", label: "L5" },
            ]}
          />
          <FilterSelect
            label="Tri"
            value={stageSort}
            onChange={(v) =>
              setStageSort(v as "recent" | "hf" | "runs" | "name")
            }
            options={[
              { value: "recent", label: "Récent" },
              { value: "hf", label: "HF" },
              { value: "runs", label: "Runs" },
              { value: "name", label: "Nom" },
            ]}
          />
          <div style={{ display: "flex" }}>
            <ViewToggleBtn
              active={stageView === "grid"}
              onClick={() => setStageView("grid")}
              label="Grille"
              icon={<IconGrid />}
            />
            <ViewToggleBtn
              active={stageView === "list"}
              onClick={() => setStageView("list")}
              label="Liste"
              icon={<IconList />}
            />
          </div>
        </div>
      </div>

      {/* Grid / List */}
      {sorted.length === 0 ? (
        <EmptyRow>
          Aucun stage correspondant —{" "}
          <a
            href="/stage-creator.html"
            style={{
              color: "#ebe5d2",
              textDecoration: "underline",
              textDecorationColor: "#7A0000",
              textUnderlineOffset: 2,
            }}
          >
            Ouvrir le créateur →
          </a>
        </EmptyRow>
      ) : stageView === "grid" ? (
        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {sorted.map((s) => (
            <StageCard
              key={s.id}
              stage={s}
              favorite={isFavoriteStage(s, favoriteStages)}
              menuOpen={openMenuId === s.id}
              onToggleMenu={() =>
                setOpenMenuId((cur) => (cur === s.id ? null : s.id))
              }
              onToggleFavorite={() => toggleFavorite(s.id)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {sorted.map((s) => (
            <StageListRow
              key={s.id}
              stage={s}
              favorite={isFavoriteStage(s, favoriteStages)}
              onToggleFavorite={() => toggleFavorite(s.id)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </div>
      )}

      {/* Bibliothèque officielle */}
      <div style={{ marginTop: 48 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.35)",
            }}
          >
            Bibliothèque officielle
          </span>
          <a
            href="/stage-creator.html"
            style={{
              background: "transparent",
              border: "1px solid rgba(235,229,210,0.16)",
              color: "#ebe5d2",
              padding: "6px 12px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Explorer →
          </a>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {BIB_OFFICIELLE.map((s) => {
            const kind = classifyStage(s);
            const color = stageBadgeColor(kind);
            return (
              <div
                key={s.id}
                style={{
                  background: "#0d0d12",
                  border: "1px solid rgba(235,229,210,0.06)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    alignSelf: "flex-start",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color,
                    border: `1px solid ${color}`,
                    padding: "2px 6px",
                  }}
                >
                  {stageBadgeLabel(s)}
                </span>
                <span
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#ebe5d2",
                    letterSpacing: "-0.01em",
                    textTransform: "uppercase",
                    lineHeight: 1.1,
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(235,229,210,0.55)",
                  }}
                >
                  {s.shots ?? "—"} coups ·{" "}
                  {s.distance_m != null ? `${s.distance_m} m` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InlineKpi({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "#0d0d12",
        border: "1px solid rgba(235,229,210,0.06)",
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          fontWeight: 700,
          color: "#ebe5d2",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid rgba(235,229,210,0.1)",
        padding: "4px 10px",
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          background: "transparent",
          border: "none",
          color: "#ebe5d2",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          outline: "none",
          paddingRight: 16,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right center",
          backgroundSize: "10px",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ViewToggleBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        background: active ? "rgba(122,0,0,0.15)" : "transparent",
        border: active
          ? "1px solid #7A0000"
          : "1px solid rgba(235,229,210,0.1)",
        color: active ? "#ebe5d2" : "rgba(235,229,210,0.55)",
        width: 36,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}

function StageDiagram({ stage }: { stage: Stage }) {
  const shapes = stageDiagramShapes(stage.diagram_data);
  const code = stageCode(stage);
  if (shapes.length === 0) {
    return (
      <div
        style={{
          height: 180,
          background: "#0a0a0c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_DISPLAY,
          fontSize: 28,
          fontWeight: 700,
          color: "rgba(235,229,210,0.18)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {code}
      </div>
    );
  }
  const W = 320;
  const H = 180;
  const pad = 28;
  const xs = shapes.map((s) => s.x);
  const ys = shapes.map((s) => s.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min((W - pad * 2) / rangeX, (H - pad * 2) / rangeY);
  const offsetX = (W - rangeX * scale) / 2 - minX * scale;
  const offsetY = (H - rangeY * scale) / 2 - minY * scale;
  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ background: "#0a0a0c", display: "block" }}
      aria-hidden
    >
      <polygon
        points={`${W / 2 - 8},${H - 10} ${W / 2 + 8},${H - 10} ${W / 2},${H - 24}`}
        fill="rgba(122,0,0,0.45)"
      />
      {shapes.map((s, i) => {
        const cx = s.x * scale + offsetX;
        const cy = s.y * scale + offsetY;
        if (s.type === "no_shoot") {
          return (
            <rect
              key={i}
              x={cx - 8}
              y={cy - 12}
              width={16}
              height={24}
              fill="none"
              stroke="#e84a3a"
              strokeWidth="1.5"
            />
          );
        }
        if (
          s.type === "steel" ||
          s.type === "plate" ||
          s.type === "popper"
        ) {
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={7}
              fill="rgba(235,229,210,0.4)"
            />
          );
        }
        return (
          <rect
            key={i}
            x={cx - 8}
            y={cy - 12}
            width={16}
            height={24}
            fill="rgba(235,229,210,0.45)"
          />
        );
      })}
    </svg>
  );
}

function StageCard({
  stage,
  favorite,
  menuOpen,
  onToggleMenu,
  onToggleFavorite,
  onDelete,
}: {
  stage: Stage;
  favorite: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  const kind = classifyStage(stage);
  const badgeColor = stageBadgeColor(kind);
  const label = stageBadgeLabel(stage);
  const code = stageCode(stage);
  const pr = stage.hf_best;
  const runs = stage.runs_count;
  return (
    <div
      style={{
        background: "#0d0d12",
        border: "1px solid rgba(235,229,210,0.06)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Diagram zone */}
      <div style={{ position: "relative" }}>
        <StageDiagram stage={stage} />
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: badgeColor,
              border: `1px solid ${badgeColor}`,
              padding: "2px 6px",
              background: "rgba(13,13,18,0.85)",
            }}
          >
            {label}
          </span>
          {favorite && (
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#f5a623",
                border: "1px solid #f5a623",
                padding: "2px 6px",
                background: "rgba(13,13,18,0.85)",
              }}
            >
              Favori ★
            </span>
          )}
        </div>
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {pr != null && pr > 0 && (
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "#ebe5d2",
                background: "rgba(13,13,18,0.85)",
                border: "1px solid rgba(235,229,210,0.16)",
                padding: "2px 6px",
              }}
            >
              ★ PR {pr.toFixed(2)}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label="Menu stage"
            style={{
              background: "rgba(13,13,18,0.85)",
              border: "1px solid rgba(235,229,210,0.16)",
              color: "#ebe5d2",
              width: 26,
              height: 22,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 14,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ···
          </button>
        </div>
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 10,
              background: "#131318",
              border: "1px solid rgba(235,229,210,0.16)",
              minWidth: 160,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <a
              href={`/stage-creator.html?stage=${encodeURIComponent(stage.id)}`}
              style={stageMenuItemStyle}
              onClick={onToggleMenu}
            >
              Ouvrir
            </a>
            <button
              type="button"
              onClick={() => {
                onToggleMenu();
              }}
              style={{ ...stageMenuItemStyle, opacity: 0.5 }}
              disabled
            >
              Dupliquer (bientôt)
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleFavorite();
                onToggleMenu();
              }}
              style={stageMenuItemStyle}
            >
              {favorite ? "Retirer favori" : "Favori"}
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleMenu();
                onDelete();
              }}
              style={{ ...stageMenuItemStyle, color: "#e84a3a" }}
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Info zone */}
      <div
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.45)",
          }}
        >
          {code} · STAGE
        </span>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 18,
            fontWeight: 700,
            color: "#ebe5d2",
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            lineHeight: 1.15,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {stage.name || "Sans nom"}
        </span>
        <div
          style={{
            display: "flex",
            gap: 12,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.55)",
          }}
        >
          <span>{stage.targets ?? "—"} cibles</span>
          <span>·</span>
          <span>{stage.shots ?? "—"} coups</span>
          <span>·</span>
          <span>
            {stage.distance_m != null ? `${stage.distance_m} m` : "—"}
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.35)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span>Dernier · {formatDate(stage.last_run_at || stage.created_at)}</span>
          {pr != null && pr > 0 && (
            <>
              <span>·</span>
              <span>HF {pr.toFixed(2)}</span>
            </>
          )}
          {runs != null && runs > 0 && (
            <>
              <span>·</span>
              <span>{runs} runs</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StageListRow({
  stage,
  favorite,
  onToggleFavorite,
  onDelete,
}: {
  stage: Stage;
  favorite: boolean;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  const kind = classifyStage(stage);
  const badgeColor = stageBadgeColor(kind);
  return (
    <div
      style={{
        background: "#0d0d12",
        border: "1px solid rgba(235,229,210,0.06)",
        padding: "12px 16px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto auto auto auto",
        alignItems: "center",
        gap: 16,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: badgeColor,
          border: `1px solid ${badgeColor}`,
          padding: "2px 6px",
        }}
      >
        {stageBadgeLabel(stage)}
      </span>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
          fontWeight: 700,
          color: "#ebe5d2",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {stage.name || "Sans nom"}
      </span>
      <span style={stageListMetaStyle}>
        {stage.shots ?? "—"} coups
      </span>
      <span style={stageListMetaStyle}>
        {stage.distance_m != null ? `${stage.distance_m} m` : "—"}
      </span>
      <span style={stageListMetaStyle}>
        {stage.hf_best != null ? `HF ${stage.hf_best.toFixed(2)}` : "—"}
      </span>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        style={{
          background: "transparent",
          border: "1px solid rgba(235,229,210,0.16)",
          color: favorite ? "#f5a623" : "rgba(235,229,210,0.55)",
          width: 28,
          height: 28,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        ★
      </button>
      <div style={{ display: "flex", gap: 6 }}>
        <a
          href={`/stage-creator.html?stage=${encodeURIComponent(stage.id)}`}
          style={{
            background: "transparent",
            border: "1px solid rgba(235,229,210,0.16)",
            color: "#ebe5d2",
            padding: "6px 10px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Ouvrir
        </a>
        <button
          type="button"
          onClick={onDelete}
          style={{
            background: "transparent",
            border: "1px solid rgba(232,74,58,0.4)",
            color: "#e84a3a",
            padding: "6px 10px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Suppr.
        </button>
      </div>
    </div>
  );
}

const stageMenuItemStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(235,229,210,0.06)",
  color: "#ebe5d2",
  padding: "10px 14px",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  cursor: "pointer",
  textAlign: "left",
  textDecoration: "none",
  display: "block",
  width: "100%",
};

const stageListMetaStyle: CSSProperties = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(235,229,210,0.55)",
  whiteSpace: "nowrap",
};

function IconGrid() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function IconList() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

/* ──────────────  Sessions view  ────────────── */

function sessionTypeColor(t?: string | null): string {
  const v = (t || "").toLowerCase();
  if (v === "competition") return "#e84a3a";
  if (v === "technique") return "#5ad99b";
  if (v === "basique") return "#f5a623";
  if (v === "libre") return "rgba(235,229,210,0.65)";
  return "rgba(235,229,210,0.45)";
}

function sessionStatus(s: Session): "planned" | "draft" | "done" {
  if (s.status === "planned" || s.status === "draft" || s.status === "done") {
    return s.status;
  }
  // Pas de status explicite ⇒ module_session (séance déjà réalisée côté app).
  // On la traite comme terminée par défaut ⇒ l'onglet PROGRAMMÉES retombe à 0.
  return "done";
}

function estimateSessionHours(s: Session): number {
  if (typeof s.instructions === "string") {
    try {
      const drills = JSON.parse(s.instructions);
      if (Array.isArray(drills) && drills.length > 0) {
        let totalSec = 0;
        for (const d of drills) {
          const par = parseFloat(String((d as { parTime?: unknown })?.parTime ?? "")) || 0;
          const reps = Math.max(1, Number((d as { reps?: unknown })?.reps) || 1);
          totalSec += par * reps * 1.5;
        }
        if (totalSec > 0) return totalSec / 3600;
      }
    } catch {
      // ignore
    }
  }
  return 0.5;
}

function totalHoursPracticed(sessions: Session[]): number {
  return (
    Math.round(
      sessions.reduce((sum, s) => sum + estimateSessionHours(s), 0) * 10
    ) / 10
  );
}

function hfMoyen(sessions: Session[]): number {
  const withHF = sessions.filter(
    (s) => s.hf_best != null && (s.hf_best as number) > 0
  );
  if (withHF.length === 0) return 0;
  return (
    withHF.reduce((sum, s) => sum + (s.hf_best as number), 0) / withHF.length
  );
}

function hfTimeline(sessions: Session[]): number[] {
  return [...sessions]
    .filter((s) => s.hf_best != null && (s.hf_best as number) > 0)
    .sort(
      (a, b) =>
        new Date(a.date || a.created_at || 0).getTime() -
        new Date(b.date || b.created_at || 0).getTime()
    )
    .slice(-8)
    .map((s) => s.hf_best as number);
}

function sessionsLast8Weeks(sessions: Session[]): number[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const buckets = new Array(8).fill(0);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  for (const s of sessions) {
    const d = new Date(s.date || s.created_at || "");
    if (isNaN(d.getTime())) continue;
    const weeksAgo = Math.floor((now.getTime() - d.getTime()) / msPerWeek);
    if (weeksAgo >= 0 && weeksAgo < 8) buckets[7 - weeksAgo] += 1;
  }
  return buckets;
}

function hoursLast8Weeks(sessions: Session[]): number[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const buckets = new Array(8).fill(0);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  for (const s of sessions) {
    const d = new Date(s.date || s.created_at || "");
    if (isNaN(d.getTime())) continue;
    const weeksAgo = Math.floor((now.getTime() - d.getTime()) / msPerWeek);
    if (weeksAgo >= 0 && weeksAgo < 8) {
      buckets[7 - weeksAgo] += estimateSessionHours(s);
    }
  }
  return buckets;
}

function todaySessionCount(sessions: Session[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return sessions.filter(
    (s) => (s.date || s.created_at || "").slice(0, 10) === today
  ).length;
}

type SessionPeriod = "7d" | "30d" | "3m" | "all";
type SessionFilter =
  | "all"
  | "real"
  | "dry"
  | "planned"
  | "records";
type SessionSort = "date" | "hf" | "shots" | "duration";

function filterAndSortSessions(
  sessions: Session[],
  filter: SessionFilter,
  period: SessionPeriod,
  sort: SessionSort
): Session[] {
  const now = new Date();
  const cutoff = new Date(now);
  if (period === "7d") cutoff.setDate(cutoff.getDate() - 7);
  else if (period === "30d") cutoff.setDate(cutoff.getDate() - 30);
  else if (period === "3m") cutoff.setDate(cutoff.getDate() - 90);

  const arr = sessions.filter((s) => {
    if (filter === "real" && s.dry_fire) return false;
    if (filter === "dry" && !s.dry_fire) return false;
    if (filter === "planned" && sessionStatus(s) !== "planned") return false;
    if (filter === "records") {
      const tags = Array.isArray(s.tags) ? s.tags : [];
      const hasPR = tags.some(
        (t) =>
          typeof t === "string" &&
          (t.toUpperCase() === "PR" || t.toUpperCase().includes("RECORD"))
      );
      if (!hasPR && (!s.hf_best || s.hf_best <= 0)) return false;
    }
    if (period !== "all") {
      const d = new Date(s.date || s.created_at || "");
      if (isNaN(d.getTime())) return false;
      if (d < cutoff) return false;
    }
    return true;
  });

  arr.sort((a, b) => {
    if (sort === "date") {
      return (
        new Date(b.date || b.created_at || 0).getTime() -
        new Date(a.date || a.created_at || 0).getTime()
      );
    }
    if (sort === "hf") return (b.hf_best || 0) - (a.hf_best || 0);
    if (sort === "shots") {
      return (
        ((b.total_shots ?? b.shots_fired) || 0) -
        ((a.total_shots ?? a.shots_fired) || 0)
      );
    }
    if (sort === "duration") {
      return estimateSessionHours(b) - estimateSessionHours(a);
    }
    return 0;
  });
  return arr;
}

type SessionGroup = {
  key: string;
  label: string;
  sessions: Session[];
  order: number;
};

function groupSessionsByPeriod(sessions: Session[]): SessionGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const groups = new Map<string, SessionGroup>();

  for (const s of sessions) {
    const d = new Date(s.date || s.created_at || "");
    if (isNaN(d.getTime())) continue;
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor(
      (today.getTime() - day.getTime()) / 86400000
    );

    let key: string;
    let label: string;
    let order: number;
    if (daysDiff < 0) {
      key = "future";
      label = "À venir";
      order = -2;
    } else if (daysDiff === 0) {
      key = "today";
      label = "Aujourd'hui";
      order = -1;
    } else if (daysDiff < 7) {
      key = "this-week";
      label = "Cette semaine";
      order = 0;
    } else if (
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    ) {
      const w = isoWeek(day);
      key = `week-${w}-${day.getFullYear()}`;
      label = `Semaine ${w}`;
      order = 1000 - w;
    } else {
      const monthLabel = day
        .toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
        .toUpperCase();
      key = `month-${day.getFullYear()}-${day.getMonth()}`;
      label = monthLabel;
      order =
        10000 - (day.getFullYear() * 12 + day.getMonth());
    }
    if (!groups.has(key)) {
      groups.set(key, { key, label, sessions: [], order });
    }
    groups.get(key)!.sessions.push(s);
  }

  return Array.from(groups.values()).sort((a, b) => a.order - b.order);
}

function exportSessionsCSV(sessions: Session[]) {
  const rows: string[][] = [
    ["Date", "Nom", "Type", "Coups", "HF", "Arme", "Stand", "Tags"],
  ];
  for (const s of sessions) {
    rows.push([
      (s.date || s.created_at || "").slice(0, 10),
      s.name || "",
      s.dry_fire ? "DRY FIRE" : s.type || "",
      String(s.total_shots ?? s.shots_fired ?? ""),
      s.hf_best != null ? String(s.hf_best) : "",
      s.weapon || "",
      s.stand || "",
      Array.isArray(s.tags) ? s.tags.join(";") : "",
    ]);
  }
  const csv = rows
    .map((r) => r.map(escapeCSVCell).join(","))
    .join("\n");
  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opmind-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

function escapeCSVCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function draftFieldsCount(s: Session): number {
  let count = 0;
  if (s.name?.trim()) count++;
  if (s.objective?.trim()) count++;
  if (typeof s.instructions === "string" && s.instructions.trim()) count++;
  if (s.weapon?.trim()) count++;
  if (s.caliber?.trim()) count++;
  if (s.target_type) count++;
  if (s.stand?.trim()) count++;
  if ((s.rounds || 0) > 0 || s.dry_fire) count++;
  return count;
}

function minutesSince(date: string | null | undefined): number {
  if (!date) return 0;
  const t = new Date(date).getTime();
  if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

function countdownStr(target: string | null | undefined): string {
  if (!target) return "—";
  const t = new Date(target).getTime();
  if (isNaN(t)) return "—";
  const diff = t - Date.now();
  if (diff <= 0) return "Maintenant";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return `Dans ${days} j ${rem} h`;
  }
  return `Dans ${hours} h ${String(mins).padStart(2, "0")}`;
}

const PAGE_SIZE = 5;

function SessionsView({
  sessions,
  setView,
  onDelete,
  onEdit,
  isShooter,
}: {
  sessions: Session[];
  setView: (v: View) => void;
  onDelete: (id: string) => void;
  onEdit: (s: Session) => void;
  isShooter: boolean;
}) {
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const [sessionPeriod, setSessionPeriod] = useState<SessionPeriod>("all");
  const [sessionSort, setSessionSort] = useState<SessionSort>("date");
  const [sessionPage, setSessionPage] = useState<number>(1);

  const totalSessions = sessions.length;
  const totalShots = sessions.reduce(
    (s, x) => s + (Number(x.total_shots) || Number(x.shots_fired) || 0),
    0
  );
  const avgHF = hfMoyen(sessions);
  const totalHours = totalHoursPracticed(sessions);
  const streak = computeStreak(sessions);
  const todayCount = todaySessionCount(sessions);

  const sparkSessions = sessionsLast8Weeks(sessions);
  const sparkShots = ammoLast8Weeks(sessions);
  const sparkHF = hfTimeline(sessions);
  const sparkHours = hoursLast8Weeks(sessions);
  const sparkStreak = sessionsLast7DaysBool(sessions);

  const counts = {
    all: sessions.length,
    real: sessions.filter((s) => !s.dry_fire).length,
    dry: sessions.filter((s) => !!s.dry_fire).length,
    planned: sessions.filter((s) => sessionStatus(s) === "planned").length,
    records: sessions.filter((s) => {
      const tags = Array.isArray(s.tags) ? s.tags : [];
      const hasPR = tags.some(
        (t) =>
          typeof t === "string" &&
          (t.toUpperCase() === "PR" || t.toUpperCase().includes("RECORD"))
      );
      return hasPR || (s.hf_best || 0) > 0;
    }).length,
  };

  const filtered = filterAndSortSessions(
    sessions,
    sessionFilter,
    sessionPeriod,
    sessionSort
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(sessionPage, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageSessions = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const groups = groupSessionsByPeriod(pageSessions);

  const TABS: { key: SessionFilter; label: string; count: number }[] = [
    { key: "all", label: "Toutes", count: counts.all },
    { key: "real", label: "Tir réel", count: counts.real },
    { key: "dry", label: "Dry fire", count: counts.dry },
    { key: "planned", label: "Programmées", count: counts.planned },
    { key: "records", label: "Records", count: counts.records },
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 24,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.45)",
            }}
          >
            Module · Carnet de tir
          </div>
          <h1
            style={{
              margin: "10px 0 0 0",
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(40px, 6vw, 72px)",
              fontWeight: 700,
              color: "#ebe5d2",
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              lineHeight: 0.95,
            }}
          >
            Mes{" "}
            <span style={{ color: "#7A0000", fontStyle: "italic" }}>
              sessions.
            </span>
          </h1>
          <div
            style={{
              marginTop: 12,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              lineHeight: 1.6,
              letterSpacing: "0.02em",
              color: "rgba(235,229,210,0.65)",
              maxWidth: 720,
            }}
          >
            Journal complet ·{" "}
            <span style={{ color: "#7A0000", fontWeight: 700 }}>
              {totalSessions}
            </span>{" "}
            sessions ·{" "}
            <span style={{ color: "#7A0000", fontWeight: 700 }}>
              {totalShots}
            </span>{" "}
            coups tirés. {todayCount} séance{todayCount > 1 ? "s" : ""}{" "}
            aujourd&apos;hui.
          </div>
        </div>

        {/* 5 KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
          }}
        >
          <SessionKpi
            label="Total sessions"
            value={String(totalSessions)}
            spark={<Sparkline kind="line" data={sparkSessions} />}
          />
          <SessionKpi
            label="Coups tirés"
            value={String(totalShots)}
            spark={<Sparkline kind="bars" data={sparkShots} />}
          />
          <SessionKpi
            label="Hit factor moyen"
            value={avgHF > 0 ? avgHF.toFixed(2) : "—"}
            spark={<Sparkline kind="line" data={sparkHF} />}
          />
          <SessionKpi
            label="Heures pratiquées"
            value={`${totalHours} h`}
            spark={<Sparkline kind="line" data={sparkHours} />}
          />
          <SessionKpi
            label="Streak actif"
            value={`${streak} ${streak > 1 ? "JRS" : "JR"}`}
            spark={<SparklineDots data={sparkStreak} />}
          />
        </div>
      </div>

      {/* Filter bar */}
      <div
        style={{
          marginTop: 32,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          paddingBottom: 12,
          borderBottom: "1px solid rgba(235,229,210,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const active = sessionFilter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setSessionFilter(t.key);
                  setSessionPage(1);
                }}
                style={{
                  background: active ? "rgba(122,0,0,0.15)" : "transparent",
                  border: active
                    ? "1px solid #7A0000"
                    : "1px solid rgba(235,229,210,0.1)",
                  color: active ? "#ebe5d2" : "rgba(235,229,210,0.55)",
                  padding: "6px 12px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {t.label} ({t.count})
              </button>
            );
          })}
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <FilterSelect
            label="Période"
            value={sessionPeriod}
            onChange={(v) => {
              setSessionPeriod(v as SessionPeriod);
              setSessionPage(1);
            }}
            options={[
              { value: "7d", label: "7 jours" },
              { value: "30d", label: "30 jours" },
              { value: "3m", label: "3 mois" },
              { value: "all", label: "Tout" },
            ]}
          />
          <FilterSelect
            label="Tri"
            value={sessionSort}
            onChange={(v) => setSessionSort(v as SessionSort)}
            options={[
              { value: "date", label: "Date récente" },
              { value: "hf", label: "HF" },
              { value: "shots", label: "Coups" },
              { value: "duration", label: "Durée" },
            ]}
          />
          <button
            type="button"
            onClick={() => exportSessionsCSV(filtered)}
            style={{
              background: "transparent",
              border: "1px solid rgba(235,229,210,0.2)",
              color: "#ebe5d2",
              padding: "6px 12px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div style={{ marginTop: 24 }}>
          <EmptyRow>
            Aucune session correspondante.{" "}
            {!isShooter && (
              <button
                type="button"
                onClick={() => setView("create_session")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ebe5d2",
                  textDecoration: "underline",
                  textDecorationColor: "#7A0000",
                  textUnderlineOffset: 2,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Créer une séance →
              </button>
            )}
          </EmptyRow>
        </div>
      ) : (
        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {groups.map((g) => {
            const grpShots = g.sessions.reduce(
              (s, x) =>
                s + (Number(x.total_shots) || Number(x.shots_fired) || 0),
              0
            );
            const grpHFs = g.sessions
              .map((s) => s.hf_best || 0)
              .filter((h) => h > 0);
            const grpHFAvg =
              grpHFs.length > 0
                ? grpHFs.reduce((a, b) => a + b, 0) / grpHFs.length
                : 0;
            return (
              <div key={g.key}>
                <TimelineGroupHeader
                  label={g.label}
                  count={g.sessions.length}
                  shots={grpShots}
                  hfAvg={grpHFAvg}
                />
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {g.sessions.map((s) => (
                    <SessionCardDispatch
                      key={s.id}
                      session={s}
                      onDelete={() => onDelete(s.id)}
                      onEdit={() => onEdit(s)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div
          style={{
            marginTop: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            paddingTop: 16,
            borderTop: "1px solid rgba(235,229,210,0.06)",
          }}
        >
          <button
            type="button"
            onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              background: "transparent",
              border: "1px solid rgba(235,229,210,0.2)",
              color: "rgba(235,229,210,0.65)",
              padding: "8px 14px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              opacity: currentPage === 1 ? 0.4 : 1,
            }}
          >
            ← Précédent
          </button>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.45)",
            }}
          >
            Page {currentPage} / {totalPages} · {filtered.length} sessions
          </span>
          <button
            type="button"
            onClick={() =>
              setSessionPage((p) => Math.min(totalPages, p + 1))
            }
            disabled={currentPage === totalPages}
            style={{
              background: "transparent",
              border: "1px solid rgba(235,229,210,0.2)",
              color: "rgba(235,229,210,0.65)",
              padding: "8px 14px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages ? 0.4 : 1,
            }}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

function SessionKpi({
  label,
  value,
  spark,
}: {
  label: string;
  value: string;
  spark?: ReactNode;
}) {
  return (
    <div
      style={{
        background: "#0d0d12",
        border: "1px solid rgba(235,229,210,0.06)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 28,
          fontWeight: 700,
          color: "#ebe5d2",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span style={{ marginTop: "auto", display: "inline-flex" }}>
        {spark}
      </span>
    </div>
  );
}

function TimelineGroupHeader({
  label,
  count,
  shots,
  hfAvg,
}: {
  label: string;
  count: number;
  shots: number;
  hfAvg: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          background: "#7A0000",
          borderRadius: 999,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#ebe5d2",
        }}
      >
        {label}
      </span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: "rgba(235,229,210,0.06)",
          marginLeft: 4,
        }}
      />
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        {count} session{count > 1 ? "s" : ""} · {shots} coups
        {hfAvg > 0 ? ` · HF ${hfAvg.toFixed(2)}` : ""}
      </span>
    </div>
  );
}

function SessionCardDispatch({
  session,
  onDelete,
  onEdit,
}: {
  session: Session;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const status = sessionStatus(session);
  if (status === "planned") {
    return <PlannedSessionCard session={session} />;
  }
  if (status === "draft") {
    return (
      <DraftSessionCard
        session={session}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    );
  }
  return (
    <DoneSessionCard
      session={session}
      onDelete={onDelete}
      onEdit={onEdit}
    />
  );
}

function SessionCard(props: {
  session: Session;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return <SessionCardDispatch {...props} />;
}

function dayPart(d: Date): { day: string; month: string } {
  const day = String(d.getDate()).padStart(2, "0");
  const month = d
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  return { day, month };
}

function PlannedSessionCard({
  session,
}: {
  session: Session;
}) {
  const d = new Date(session.date || session.created_at || "");
  const valid = !isNaN(d.getTime());
  const dp = valid ? dayPart(d) : { day: "—", month: "—" };
  const shots = session.total_shots ?? session.shots_fired ?? 0;
  let drillsCount = 0;
  if (typeof session.instructions === "string") {
    try {
      const parsed = JSON.parse(session.instructions);
      if (Array.isArray(parsed)) drillsCount = parsed.length;
    } catch {
      // ignore
    }
  }
  const hourLabel = valid
    ? d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  return (
    <div
      style={{
        background:
          "linear-gradient(90deg, rgba(122,0,0,0.08), transparent 60%)",
        border: "1px solid rgba(235,229,210,0.08)",
        borderLeft: "3px solid #7A0000",
        padding: 20,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          minWidth: 80,
        }}
      >
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 56,
            fontWeight: 700,
            color: "#ebe5d2",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {dp.day}
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.55)",
          }}
        >
          {dp.month}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 18,
            fontWeight: 700,
            color: "#ebe5d2",
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {session.name || "Séance programmée"}
        </span>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.55)",
          }}
        >
          <span>{hourLabel}</span>
          {session.stand && (
            <>
              <span>·</span>
              <span>{session.stand}</span>
            </>
          )}
          {session.weapon && (
            <>
              <span>·</span>
              <span>{session.weapon}</span>
            </>
          )}
          {drillsCount > 0 && (
            <>
              <span>·</span>
              <span>{drillsCount} drills</span>
            </>
          )}
          <span>·</span>
          <span>{shots} coups</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 20,
            fontWeight: 700,
            color: "#7A0000",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          {countdownStr(session.date)}
        </span>
      </div>
    </div>
  );
}

function DoneSessionCard({
  session,
  onDelete,
  onEdit,
}: {
  session: Session;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const d = new Date(session.date || session.created_at || "");
  const valid = !isNaN(d.getTime());
  const dp = valid ? dayPart(d) : { day: "—", month: "—" };
  const shots = session.total_shots ?? session.shots_fired ?? 0;
  const isDryFire = !!session.dry_fire;
  const typeUpper = (session.type || "").toUpperCase();
  const typeCol = sessionTypeColor(session.type);
  const badgeText = isDryFire ? "DRY FIRE" : typeUpper;
  const badgeColor = isDryFire ? "#1a3a5c" : typeCol;
  let drillsCount = 0;
  if (typeof session.instructions === "string") {
    try {
      const parsed = JSON.parse(session.instructions);
      if (Array.isArray(parsed)) drillsCount = parsed.length;
    } catch {
      // ignore
    }
  }
  const hours = estimateSessionHours(session);
  const hoursLbl =
    hours > 0
      ? hours < 1
        ? `${Math.round(hours * 60)} min`
        : `${hours.toFixed(1)} h`
      : "—";

  const statsColor = isDryFire ? "#f5a623" : "#7A0000";
  const tags = Array.isArray(session.tags) ? session.tags : [];
  const isPR = tags.some(
    (t) => typeof t === "string" && t.toUpperCase() === "PR"
  );

  return (
    <div
      style={{
        background: "#131318",
        border: "1px solid rgba(235,229,210,0.08)",
        padding: 20,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        alignItems: "stretch",
        gap: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          minWidth: 64,
        }}
      >
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 36,
            fontWeight: 700,
            color: "#ebe5d2",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {dp.day}
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.55)",
          }}
        >
          {dp.month}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {badgeText && (
            <span
              style={{
                border: `1px solid ${badgeColor}`,
                color: badgeColor,
                padding: "2px 8px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {badgeText}
            </span>
          )}
          {isPR && (
            <span
              style={{
                border: "1px solid #f5a623",
                color: "#f5a623",
                padding: "2px 8px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              ★ PR
            </span>
          )}
        </div>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 20,
            fontWeight: 700,
            color: "#ebe5d2",
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            lineHeight: 1.1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {session.name || "Sans nom"}
        </span>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.55)",
          }}
        >
          <span>{hoursLbl}</span>
          {session.stand && (
            <>
              <span>·</span>
              <span>{session.stand}</span>
            </>
          )}
          {session.weapon && (
            <>
              <span>·</span>
              <span>{session.weapon}</span>
            </>
          )}
          {drillsCount > 0 && (
            <>
              <span>·</span>
              <span>{drillsCount} drills</span>
            </>
          )}
          <span>·</span>
          <span>{shots} coups</span>
        </div>
        {session.context_notes && (
          <div
            style={{
              marginTop: 4,
              background: "rgba(122,0,0,0.1)",
              borderLeft: "2px solid #7A0000",
              padding: "8px 12px",
              fontFamily: "var(--font-barlow), system-ui, sans-serif",
              fontSize: 12,
              fontStyle: "italic",
              color: "rgba(235,229,210,0.75)",
              lineHeight: 1.5,
            }}
          >
            {session.context_notes}
          </div>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          alignSelf: "center",
          minWidth: 280,
        }}
      >
        {isDryFire ? (
          <>
            <DoneStat label="Trans. moy." value="—" color={statsColor} />
            <DoneStat label="Best trans." value="—" color={statsColor} />
            <DoneStat
              label="Reps"
              value={String(drillsCount || "—")}
              color={statsColor}
            />
            <DoneStat
              label="Coups"
              value={String(shots)}
              color={statsColor}
            />
          </>
        ) : (
          <>
            <DoneStat
              label="Hit Factor"
              value={session.hf_best ? session.hf_best.toFixed(2) : "—"}
              color={statsColor}
            />
            <DoneStat label="Accuracy" value="—" color={statsColor} />
            <DoneStat label="Split moy." value="—" color={statsColor} />
            <DoneStat
              label="Coups"
              value={String(shots)}
              color={statsColor}
            />
          </>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onEdit}
          aria-label="Voir la session"
          title="Voir la session"
          style={{
            background: "transparent",
            border: "1px solid rgba(235,229,210,0.16)",
            color: "rgba(235,229,210,0.65)",
            width: 32,
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 14,
          }}
        >
          ›
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{
            background: "transparent",
            border: "1px solid rgba(232,74,58,0.4)",
            color: "#e84a3a",
            padding: "6px 10px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Suppr.
        </button>
      </div>
    </div>
  );
}

function DoneStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 20,
          fontWeight: 700,
          color,
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DraftSessionCard({
  session,
  onDelete,
  onEdit,
}: {
  session: Session;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const filled = draftFieldsCount(session);
  const startedMin = minutesSince(session.created_at);
  return (
    <div
      style={{
        background: "transparent",
        border: "1px dashed rgba(235,229,210,0.15)",
        padding: 20,
        opacity: 0.7,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
      >
        <span
          style={{
            border: "1px solid rgba(235,229,210,0.3)",
            color: "rgba(235,229,210,0.55)",
            padding: "2px 8px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Brouillon
        </span>
        <span
          style={{
            border: "1px solid rgba(235,229,210,0.2)",
            color: "rgba(235,229,210,0.45)",
            padding: "2px 8px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Custom
        </span>
      </div>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 20,
          fontWeight: 700,
          color: session.name?.trim()
            ? "#ebe5d2"
            : "rgba(235,229,210,0.3)",
          letterSpacing: "-0.01em",
          textTransform: "uppercase",
          lineHeight: 1.1,
        }}
      >
        {session.name?.trim() || "Séance sans nom..."}
      </span>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        Démarrée il y a {startedMin} min · {filled} champs sur 8 remplis ·
        Auto-saved
      </span>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={onDelete}
          style={{
            background: "transparent",
            border: "1px solid rgba(232,74,58,0.4)",
            color: "#e84a3a",
            padding: "8px 14px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Supprimer
        </button>
        <button
          type="button"
          onClick={onEdit}
          style={{
            background: "#7A0000",
            border: "none",
            color: "#fff",
            padding: "8px 14px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Reprendre →
        </button>
      </div>
    </div>
  );
}

const detailSecondaryStyle: CSSProperties = {
  marginTop: 4,
  fontFamily: "var(--font-barlow), system-ui, sans-serif",
  fontSize: 13,
  lineHeight: 1.6,
  color: "rgba(235,229,210,0.65)",
};

const detailLabelInlineStyle: CSSProperties = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(235,229,210,0.45)",
};

function DetailGroupTitle({ children }: { children: ReactNode }) {
  return (
    <h4
      style={{
        margin: 0,
        marginBottom: 8,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(235,229,210,0.55)",
      }}
    >
      {children}
    </h4>
  );
}

function DetailGroup({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div>
      <DetailGroupTitle>{title}</DetailGroupTitle>
      <p
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
          color: "#ebe5d2",
          letterSpacing: "0.04em",
          margin: 0,
        }}
      >
        {primary}
      </p>
      {secondary && <p style={detailSecondaryStyle}>{secondary}</p>}
    </div>
  );
}

/* ──────────────  Performance view  ────────────── */

type PerfPeriod = "7d" | "30d" | "90d" | "ytd" | "2026";
type PerfMetric =
  | "hit_factor"
  | "accuracy"
  | "draw_time"
  | "split_time"
  | "shots";

const PERF_PERIODS: { value: PerfPeriod; label: string; days: number | null }[] = [
  { value: "7d", label: "7 J", days: 7 },
  { value: "30d", label: "30 J", days: 30 },
  { value: "90d", label: "90 J", days: 90 },
  { value: "ytd", label: "YTD", days: null },
  { value: "2026", label: "2026", days: null },
];

const PERF_METRICS: { value: PerfMetric; label: string; target?: number }[] = [
  { value: "hit_factor", label: "Hit Factor", target: 7.0 },
  { value: "accuracy", label: "Accuracy" },
  { value: "draw_time", label: "Draw Time" },
  { value: "split_time", label: "Split Time" },
  { value: "shots", label: "Coups / séance" },
];

const PERF_CARTRIDGE_BUCKETS: { key: string; label: string; match: string[] }[] = [
  { key: "basique", label: "Basique · Statique", match: ["basique", "statique"] },
  {
    key: "technique",
    label: "Technique · Transitions",
    match: ["technique", "transition"],
  },
  { key: "stage", label: "Stage IPSC", match: ["stage", "ipsc"] },
  { key: "steel", label: "Steel · Plates", match: ["steel", "plate"] },
  {
    key: "swh",
    label: "Strong/Weak Hand",
    match: ["swh", "strong", "weak"],
  },
];

function filterByPerfPeriod(sessions: Session[], period: PerfPeriod): Session[] {
  if (period === "2026") {
    return sessions.filter((s) => {
      const d = new Date(s.date || s.created_at || "");
      return !isNaN(d.getTime()) && d.getFullYear() === 2026;
    });
  }
  if (period === "ytd") {
    const year = new Date().getFullYear();
    return sessions.filter((s) => {
      const d = new Date(s.date || s.created_at || "");
      return !isNaN(d.getTime()) && d.getFullYear() === year;
    });
  }
  const days =
    PERF_PERIODS.find((p) => p.value === period)?.days ?? 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return sessions.filter((s) => {
    const d = new Date(s.date || s.created_at || "");
    return !isNaN(d.getTime()) && d >= cutoff;
  });
}

function linearRegression(
  pts: { x: number; y: number }[]
): { slope: number; intercept: number } {
  const n = pts.length;
  if (n < 2) return { slope: 0, intercept: pts[0]?.y || 0 };
  const sumX = pts.reduce((s, p) => s + p.x, 0);
  const sumY = pts.reduce((s, p) => s + p.y, 0);
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function metricValue(s: Session, metric: PerfMetric): number | null {
  if (metric === "hit_factor")
    return s.hf_best != null && s.hf_best > 0 ? s.hf_best : null;
  if (metric === "shots")
    return Number(s.total_shots) || Number(s.shots_fired) || 0;
  return null;
}

function metricTarget(metric: PerfMetric): number | null {
  return PERF_METRICS.find((m) => m.value === metric)?.target ?? null;
}

function heatmapData(sessions: Session[]): number[][] {
  const matrix: number[][] = Array.from({ length: 7 }, () =>
    new Array(24).fill(0)
  );
  for (const s of sessions) {
    const d = new Date(s.date || s.created_at || "");
    if (isNaN(d.getTime())) continue;
    const day = (d.getDay() + 6) % 7;
    const hour = d.getHours();
    matrix[day][hour] += 1;
  }
  return matrix;
}

function topTags(sessions: Session[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const tags = Array.isArray(s.tags) ? s.tags : [];
    for (const t of tags) {
      if (typeof t === "string" && t.trim())
        counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function cartridgeBuckets(sessions: Session[]): number[] {
  const counts = PERF_CARTRIDGE_BUCKETS.map(() => 0);
  for (const s of sessions) {
    const tags = Array.isArray(s.tags) ? s.tags : [];
    const shots = Number(s.total_shots) || Number(s.shots_fired) || 0;
    for (let i = 0; i < PERF_CARTRIDGE_BUCKETS.length; i++) {
      const bucket = PERF_CARTRIDGE_BUCKETS[i];
      const hit = tags.some(
        (t) =>
          typeof t === "string" &&
          bucket.match.some((m) => t.toLowerCase().includes(m))
      );
      if (hit) counts[i] += shots;
    }
  }
  return counts;
}

type InsightItem = {
  title: string;
  pattern: string;
  recommendation: string;
};
type InsightsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; insights: InsightItem[]; updatedAt: string }
  | { status: "error"; reason: "no_data" | "api_fail" };

function PerformanceView({
  sessions,
  stages,
}: {
  sessions: Session[];
  stages: Stage[];
}) {
  const [perfPeriod, setPerfPeriod] = useState<PerfPeriod>("30d");
  const [perfMetric, setPerfMetric] = useState<PerfMetric>("hit_factor");
  const [insights, setInsights] = useState<InsightsState>({ status: "idle" });

  const periodSessions = filterByPerfPeriod(sessions, perfPeriod);
  const totalShots = periodSessions.reduce(
    (s, x) => s + (Number(x.total_shots) || Number(x.shots_fired) || 0),
    0
  );
  const totalHours = totalHoursPracticed(periodSessions);
  const avgHF = hfMoyen(periodSessions);
  const prevPeriodSessions = (() => {
    const days =
      PERF_PERIODS.find((p) => p.value === perfPeriod)?.days ?? 30;
    const periodDays = days ?? 30;
    const start = new Date();
    start.setDate(start.getDate() - periodDays * 2);
    const end = new Date();
    end.setDate(end.getDate() - periodDays);
    return sessions.filter((s) => {
      const d = new Date(s.date || s.created_at || "");
      return !isNaN(d.getTime()) && d >= start && d < end;
    });
  })();
  const prevAvgHF = hfMoyen(prevPeriodSessions);
  const hfTrend =
    prevAvgHF > 0 && avgHF > 0
      ? Math.round(((avgHF - prevAvgHF) / prevAvgHF) * 100)
      : null;
  const periodDaysLabel =
    perfPeriod === "7d"
      ? "7"
      : perfPeriod === "30d"
        ? "30"
        : perfPeriod === "90d"
          ? "90"
          : perfPeriod === "ytd"
            ? "année"
            : "2026";

  // ── Chart pts based on selected metric ──
  const sorted = [...periodSessions].sort(
    (a, b) =>
      new Date(a.date || a.created_at || 0).getTime() -
      new Date(b.date || b.created_at || 0).getTime()
  );
  const rawPts = sorted
    .map((s) => ({
      date: s.date || s.created_at || "",
      value: metricValue(s, perfMetric),
    }))
    .filter((p): p is { date: string; value: number } => p.value != null);

  const CW = 1200;
  const CH = 300;
  const padL = 60;
  const padR = 24;
  const padT = 32;
  const padB = 36;
  const innerW = CW - padL - padR;
  const innerH = CH - padT - padB;
  const maxV =
    rawPts.length > 0 ? Math.max(...rawPts.map((p) => p.value)) : 1;
  const minV =
    rawPts.length > 0 ? Math.min(0, ...rawPts.map((p) => p.value)) : 0;
  const span = maxV - minV || 1;
  const pts = rawPts.map((d, i) => {
    const x =
      rawPts.length === 1
        ? padL + innerW / 2
        : padL + (i / (rawPts.length - 1)) * innerW;
    const y = padT + innerH - ((d.value - minV) / span) * innerH;
    return { x, y, value: d.value, date: d.date };
  });
  const path =
    pts.length > 0
      ? pts
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
          )
          .join(" ")
      : "";
  const fillPath =
    pts.length > 1
      ? `${path} L ${pts[pts.length - 1].x.toFixed(1)} ${padT + innerH} L ${pts[0].x.toFixed(1)} ${padT + innerH} Z`
      : "";
  const reg = linearRegression(rawPts.map((d, i) => ({ x: i, y: d.value })));
  const trendStartY =
    padT + innerH - ((reg.intercept - minV) / span) * innerH;
  const trendEndY =
    padT +
    innerH -
    ((reg.intercept + reg.slope * Math.max(0, rawPts.length - 1) - minV) /
      span) *
      innerH;
  const targetVal = metricTarget(perfMetric);
  const targetY =
    targetVal != null
      ? padT + innerH - ((targetVal - minV) / span) * innerH
      : null;
  const maxPt =
    pts.length > 0
      ? pts.reduce((a, b) => (b.value > a.value ? b : a), pts[0])
      : null;
  const xLabelEvery = Math.max(1, Math.ceil(pts.length / 8));

  // ── Insights fetch ──
  useEffect(() => {
    if (periodSessions.length < 1) {
      setInsights({ status: "error", reason: "no_data" });
      return;
    }
    let cancelled = false;
    (async () => {
      setInsights({ status: "loading" });
      try {
        const summary = {
          period: perfPeriod,
          sessions: periodSessions.length,
          totalShots,
          hfMoyen: avgHF > 0 ? Number(avgHF.toFixed(2)) : null,
          types: {
            real: periodSessions.filter((s) => !s.dry_fire).length,
            dry: periodSessions.filter((s) => !!s.dry_fire).length,
          },
          topTags: topTags(periodSessions, 5),
        };
        const res = await fetch("/api/coach-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(summary),
        });
        if (!res.ok) throw new Error("api");
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data?.insights) && data.insights.length > 0) {
          const items: InsightItem[] = data.insights
            .map((d: unknown) => {
              const dd = (d || {}) as Record<string, unknown>;
              return {
                title: typeof dd.title === "string" ? dd.title : "",
                pattern: typeof dd.pattern === "string" ? dd.pattern : "",
                recommendation:
                  typeof dd.recommendation === "string"
                    ? dd.recommendation
                    : "",
              };
            })
            .filter((i: InsightItem) => i.title);
          if (items.length > 0) {
            setInsights({
              status: "ok",
              insights: items,
              updatedAt: new Date().toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            });
            return;
          }
        }
        throw new Error("empty");
      } catch {
        if (!cancelled) setInsights({ status: "error", reason: "api_fail" });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfPeriod, periodSessions.length]);

  // ── Records ──
  const recordStages = [...stages]
    .filter((s) => (s.hf_best || 0) > 0)
    .sort((a, b) => (b.hf_best || 0) - (a.hf_best || 0))
    .slice(0, 5);

  // ── Heatmap ──
  const heat = heatmapData(periodSessions);
  const heatMax = Math.max(1, ...heat.flat());
  const dayLabels = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
  let peakDay = 0;
  let peakHour = 0;
  let peakVal = 0;
  let lowDay = 0;
  let lowHour = 0;
  let lowVal = Infinity;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const v = heat[d][h];
      if (v > peakVal) {
        peakVal = v;
        peakDay = d;
        peakHour = h;
      }
      if (v > 0 && v < lowVal) {
        lowVal = v;
        lowDay = d;
        lowHour = h;
      }
    }
  }

  // ── 30-session bar chart ──
  const lastSessions = [...sessions]
    .sort(
      (a, b) =>
        new Date(b.date || b.created_at || 0).getTime() -
        new Date(a.date || a.created_at || 0).getTime()
    )
    .slice(0, 30)
    .reverse();
  const ssMax = Math.max(
    1,
    ...lastSessions.map(
      (s) => Number(s.total_shots) || Number(s.shots_fired) || 0
    )
  );
  const ssAvg =
    lastSessions.length > 0
      ? lastSessions.reduce(
          (s, x) =>
            s + (Number(x.total_shots) || Number(x.shots_fired) || 0),
          0
        ) / lastSessions.length
      : 0;

  // ── Cartridges ──
  const buckets = cartridgeBuckets(periodSessions);
  const bucketsMax = Math.max(1, ...buckets);
  const totalBucketShots = buckets.reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 32,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.45)",
            }}
          >
            Module · Analyse longitudinale
          </div>
          <h1
            style={{
              margin: "10px 0 0 0",
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(40px, 6vw, 72px)",
              fontWeight: 700,
              color: "#ebe5d2",
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              lineHeight: 0.95,
            }}
          >
            Performance{" "}
            <span style={{ color: "#7A0000", fontStyle: "italic" }}>
              longitudinale.
            </span>
          </h1>
          <div
            style={{
              marginTop: 12,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              lineHeight: 1.6,
              letterSpacing: "0.02em",
              color: "rgba(235,229,210,0.65)",
              maxWidth: 720,
            }}
          >
            <span style={{ color: "#ebe5d2", fontWeight: 700 }}>
              {periodSessions.length}
            </span>{" "}
            sessions ·{" "}
            <span style={{ color: "#ebe5d2", fontWeight: 700 }}>
              {totalShots}
            </span>{" "}
            coups ·{" "}
            <span style={{ color: "#ebe5d2", fontWeight: 700 }}>
              {totalHours} h
            </span>{" "}
            sur les {periodDaysLabel}{" "}
            {perfPeriod === "ytd" || perfPeriod === "2026"
              ? "courant"
              : "derniers jours"}
            . Hit factor moyen{" "}
            <span
              style={{
                color:
                  hfTrend == null
                    ? "rgba(235,229,210,0.55)"
                    : hfTrend >= 0
                      ? "#5ad99b"
                      : "#e84a3a",
                fontWeight: 700,
              }}
            >
              {hfTrend == null
                ? "—"
                : `${hfTrend >= 0 ? "+" : ""}${hfTrend}%`}
            </span>{" "}
            sur la période.
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignSelf: "start" }}>
          {PERF_PERIODS.map((p) => {
            const active = perfPeriod === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPerfPeriod(p.value)}
                style={{
                  background: active
                    ? "rgba(122,0,0,0.15)"
                    : "transparent",
                  border: active
                    ? "1px solid #7A0000"
                    : "1px solid rgba(235,229,210,0.1)",
                  color: active ? "#ebe5d2" : "rgba(235,229,210,0.55)",
                  padding: "6px 12px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5 KPIs */}
      <div
        style={{
          marginTop: 32,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
        }}
      >
        <PerfKpi
          label="Hit factor moyen"
          value={avgHF > 0 ? avgHF.toFixed(2) : "—"}
          trend={hfTrend}
          spark={
            <Sparkline
              kind="line"
              data={hfTimeline(periodSessions)}
            />
          }
          sub={`Cible · 7.00`}
        />
        <PerfKpi
          label="Coups tirés"
          value={String(totalShots)}
          trend={null}
          spark={
            <Sparkline
              kind="bars"
              data={ammoLast8Weeks(periodSessions)}
            />
          }
          sub={`Sur ${periodDaysLabel} J`}
        />
        <PerfKpi
          label="Accuracy A-Zone"
          value="—"
          trend={null}
          spark={null}
          sub="Données app requises"
        />
        <PerfKpi
          label="Draw moyen"
          value="—"
          trend={null}
          spark={null}
          sub="Données app requises"
        />
        <PerfKpi
          label="Split moyen"
          value="—"
          trend={null}
          spark={null}
          sub="Données app requises"
        />
      </div>

      {/* SECTION 01 — Évolution */}
      <PerfSectionHeader index="01" label="Évolution longitudinale" />
      <div
        style={{
          ...sectionCardStyle,
          background: "#0d0d12",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {PERF_METRICS.map((m) => {
            const active = perfMetric === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setPerfMetric(m.value)}
                style={{
                  background: active
                    ? "rgba(122,0,0,0.15)"
                    : "transparent",
                  border: active
                    ? "1px solid #7A0000"
                    : "1px solid rgba(235,229,210,0.08)",
                  color: active ? "#ebe5d2" : "rgba(235,229,210,0.55)",
                  padding: "6px 12px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        {pts.length === 0 ? (
          <div
            style={{
              padding: "48px 0",
              textAlign: "center",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.35)",
            }}
          >
            Aucune donnée pour cette métrique — données app requises
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${CW} ${CH}`}
              style={{
                width: "100%",
                height: "auto",
                background: "#0d0d12",
              }}
              role="img"
              aria-label="Évolution"
            >
              <defs>
                <linearGradient
                  id="perf-fill"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#7A0000"
                    stopOpacity="0.18"
                  />
                  <stop
                    offset="100%"
                    stopColor="#7A0000"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const y = padT + innerH * t;
                const value = (maxV - (maxV - minV) * t).toFixed(1);
                return (
                  <g key={t}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={CW - padR}
                      y2={y}
                      stroke="rgba(235,229,210,0.04)"
                      strokeWidth="1"
                    />
                    <text
                      x={padL - 8}
                      y={y + 3}
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="9"
                      fill="rgba(235,229,210,0.45)"
                      textAnchor="end"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}
              {fillPath && <path d={fillPath} fill="url(#perf-fill)" />}
              {targetY != null && (
                <g>
                  <line
                    x1={padL}
                    y1={targetY}
                    x2={CW - padR}
                    y2={targetY}
                    stroke="rgba(90,217,155,0.5)"
                    strokeWidth="1"
                    strokeDasharray="6 6"
                  />
                  <text
                    x={CW - padR - 6}
                    y={targetY - 6}
                    fontFamily="JetBrains Mono, monospace"
                    fontSize="9"
                    fill="rgba(90,217,155,0.7)"
                    textAnchor="end"
                  >
                    CI {targetVal?.toFixed(1)}
                  </text>
                </g>
              )}
              {pts.length >= 2 && (
                <line
                  x1={pts[0].x}
                  y1={trendStartY}
                  x2={pts[pts.length - 1].x}
                  y2={trendEndY}
                  stroke="rgba(235,229,210,0.3)"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
              )}
              {path && (
                <path
                  d={path}
                  fill="none"
                  stroke="#7A0000"
                  strokeWidth="2"
                />
              )}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#7A0000"
                />
              ))}
              {maxPt && (
                <g>
                  <rect
                    x={maxPt.x - 30}
                    y={Math.max(8, maxPt.y - 28)}
                    width={60}
                    height={18}
                    fill="rgba(13,13,18,0.95)"
                    stroke="#f5a623"
                  />
                  <text
                    x={maxPt.x}
                    y={Math.max(20, maxPt.y - 15)}
                    fontFamily="JetBrains Mono, monospace"
                    fontSize="10"
                    fontWeight="700"
                    fill="#f5a623"
                    textAnchor="middle"
                  >
                    ★ PR {maxPt.value.toFixed(2)}
                  </text>
                </g>
              )}
              {pts.map((p, i) => {
                if (
                  i % xLabelEvery !== 0 &&
                  i !== pts.length - 1
                )
                  return null;
                const label = formatDate(p.date).slice(0, 5);
                return (
                  <text
                    key={`x-${i}`}
                    x={p.x}
                    y={CH - 10}
                    fontFamily="JetBrains Mono, monospace"
                    fontSize="9"
                    fill="rgba(235,229,210,0.45)"
                    textAnchor="middle"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 24,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(235,229,210,0.55)",
                flexWrap: "wrap",
              }}
            >
              <LegendDot color="#7A0000" label={`${PERF_METRICS.find((m) => m.value === perfMetric)?.label} par session`} />
              <LegendDot
                color="rgba(235,229,210,0.3)"
                label="Tendance linéaire"
                dashed
              />
              {targetVal != null && (
                <LegendDot
                  color="rgba(90,217,155,0.7)"
                  label={`Cible ${targetVal.toFixed(1)}`}
                  dashed
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* SECTION 02 — Précision & Cadence */}
      <PerfSectionHeader index="02" label="Précision & cadence" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "#0d0d12",
            border: "1px solid rgba(235,229,210,0.06)",
            padding: 24,
          }}
        >
          <div style={perfSubHeaderStyle}>
            // Répartition zones · 0 impacts · {periodDaysLabel} J
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 24,
              marginTop: 16,
              alignItems: "center",
            }}
          >
            <IPSCTarget />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <ZoneBar label="A" pct={75} count={0} color="#5ad99b" />
              <ZoneBar label="C" pct={18} count={0} color="#f5a623" />
              <ZoneBar label="D" pct={5} count={0} color="#e84a3a" />
              <ZoneBar label="M" pct={2} count={0} color="#6e0808" />
            </div>
          </div>
          <p style={perfPlaceholderStyle}>
            Données app requises pour les zones d&apos;impact réelles.
          </p>
        </div>

        <div
          style={{
            background: "#0d0d12",
            border: "1px solid rgba(235,229,210,0.06)",
            padding: 24,
          }}
        >
          <div style={perfSubHeaderStyle}>
            // Distribution splits · N=0
          </div>
          <SplitsHistogram />
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.55)",
            }}
          >
            <span>Moyenne · —</span>
            <span>P50 · —</span>
            <span>P90 · —</span>
            <span style={{ color: "#5ad99b" }}>Cible ≤ 0.20 s</span>
          </div>
          <p style={perfPlaceholderStyle}>
            Données app requises pour les splits par session.
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          background: "#0d0d12",
          border: "1px solid rgba(235,229,210,0.06)",
          padding: 24,
        }}
      >
        <div style={perfSubHeaderStyle}>
          // Cartouches / type · {totalBucketShots} coups
        </div>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {PERF_CARTRIDGE_BUCKETS.map((b, i) => {
            const v = buckets[i];
            const pct = (v / bucketsMax) * 100;
            return (
              <div
                key={b.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr 60px",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(235,229,210,0.65)",
                  }}
                >
                  {b.label}
                </span>
                <div
                  style={{
                    position: "relative",
                    height: 10,
                    background: "#1a1a22",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${pct}%`,
                      background: "#7A0000",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#ebe5d2",
                    letterSpacing: "-0.01em",
                    textAlign: "right",
                  }}
                >
                  {v}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 03 — Records & Insights */}
      <PerfSectionHeader index="03" label="Records & Insights" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "#0d0d12",
            border: "1px solid rgba(235,229,210,0.06)",
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={perfSubHeaderStyle}>// ★ Personal records</span>
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(235,229,210,0.45)",
              }}
            >
              Tous temps
            </span>
          </div>
          {recordStages.length === 0 ? (
            <p style={perfPlaceholderStyle}>
              Aucun record enregistré — lance des runs depuis l&apos;app
              OpMind.
            </p>
          ) : (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {recordStages.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "32px 1fr auto auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom:
                      i === recordStages.length - 1
                        ? "none"
                        : "1px solid rgba(235,229,210,0.06)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: "#7A0000",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#ebe5d2",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.name || "Sans nom"}
                    </span>
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 9,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "rgba(235,229,210,0.45)",
                      }}
                    >
                      {stageCode(s)} · {formatDate(s.last_run_at || s.created_at)}{" "}
                      · {s.runs_count || 0} runs
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#7A0000",
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {(s.hf_best ?? 0).toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "#5ad99b",
                      border: "1px solid #5ad99b",
                      padding: "2px 6px",
                    }}
                  >
                    Hold
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            background: "#0d0d12",
            border: "1px solid rgba(235,229,210,0.06)",
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={perfSubHeaderStyle}>// Insights coach · IA</span>
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(235,229,210,0.45)",
              }}
            >
              {insights.status === "ok"
                ? `Auto · MAJ ${insights.updatedAt}`
                : "Auto"}
            </span>
          </div>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              minHeight: 120,
            }}
          >
            {insights.status === "loading" && (
              <div
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(235,229,210,0.55)",
                  animation: "opmind-blink 1.4s ease-in-out infinite",
                }}
              >
                Analyse en cours...
              </div>
            )}
            {insights.status === "error" && (
              <p style={perfPlaceholderStyle}>
                {insights.reason === "no_data"
                  ? "Données insuffisantes — enregistre au moins 5 sessions pour activer les insights."
                  : "Données insuffisantes — enregistre au moins 5 sessions pour activer les insights."}
              </p>
            )}
            {insights.status === "ok" &&
              insights.insights.map((it, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: "#7A0000",
                      paddingTop: 2,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#ebe5d2",
                        letterSpacing: "-0.01em",
                        textTransform: "uppercase",
                        lineHeight: 1.1,
                      }}
                    >
                      {it.title}
                    </span>
                    {it.pattern && (
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "rgba(235,229,210,0.55)",
                          lineHeight: 1.5,
                        }}
                      >
                        {it.pattern}
                      </span>
                    )}
                    {it.recommendation && (
                      <span
                        style={{
                          marginTop: 4,
                          fontFamily:
                            "var(--font-barlow), system-ui, sans-serif",
                          fontSize: 13,
                          fontStyle: "italic",
                          color: "rgba(235,229,210,0.75)",
                          lineHeight: 1.5,
                        }}
                      >
                        {it.recommendation}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* SECTION 04 — Cadence & Conditions */}
      <PerfSectionHeader index="04" label="Cadence & conditions" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "#0d0d12",
            border: "1px solid rgba(235,229,210,0.06)",
            padding: 24,
          }}
        >
          <div style={perfSubHeaderStyle}>
            // Heatmap heure × jour
          </div>
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "32px 1fr",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {dayLabels.map((d) => (
                <span
                  key={d}
                  style={{
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 8,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(235,229,210,0.45)",
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: "repeat(7, 16px)",
                  gridTemplateColumns: "repeat(24, 1fr)",
                  gap: 2,
                }}
              >
                {heat.map((row, di) =>
                  row.map((v, hi) => {
                    const op = v === 0 ? 0.05 : 0.15 + (v / heatMax) * 0.85;
                    return (
                      <div
                        key={`${di}-${hi}`}
                        title={`${dayLabels[di]} ${hi}h · ${v}`}
                        style={{
                          background: `rgba(122,0,0,${op.toFixed(2)})`,
                          border: "1px solid rgba(235,229,210,0.04)",
                        }}
                      />
                    );
                  })
                )}
              </div>
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 8,
                  color: "rgba(235,229,210,0.4)",
                  letterSpacing: "0.14em",
                }}
              >
                <span>0H</span>
                <span>6H</span>
                <span>12H</span>
                <span>18H</span>
                <span>23H</span>
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.55)",
            }}
          >
            <span>
              Pic ·{" "}
              <span style={{ color: "#7A0000", fontWeight: 700 }}>
                {peakVal > 0
                  ? `${dayLabels[peakDay]} ${peakHour}h`
                  : "—"}
              </span>
            </span>
            <span>
              Faible ·{" "}
              <span style={{ color: "#ebe5d2" }}>
                {lowVal !== Infinity
                  ? `${dayLabels[lowDay]} ${lowHour}h`
                  : "—"}
              </span>
            </span>
          </div>
        </div>

        <div
          style={{
            background: "#0d0d12",
            border: "1px solid rgba(235,229,210,0.06)",
            padding: 24,
          }}
        >
          <div style={perfSubHeaderStyle}>
            // Cartouches par séance · 30 dernières
          </div>
          {lastSessions.length === 0 ? (
            <p style={perfPlaceholderStyle}>Aucune session sur la période.</p>
          ) : (
            <svg
              viewBox="0 0 600 200"
              style={{ width: "100%", marginTop: 16 }}
              role="img"
              aria-label="Cartouches par séance"
            >
              {lastSessions.map((s, i) => {
                const shots =
                  Number(s.total_shots) || Number(s.shots_fired) || 0;
                const barW = 600 / Math.max(1, lastSessions.length);
                const h = (shots / ssMax) * 160;
                return (
                  <rect
                    key={i}
                    x={i * barW + 1}
                    y={180 - h}
                    width={Math.max(2, barW - 2)}
                    height={Math.max(1, h)}
                    fill="#7A0000"
                  />
                );
              })}
              <line
                x1="0"
                y1={180 - (ssAvg / ssMax) * 160}
                x2="600"
                y2={180 - (ssAvg / ssMax) * 160}
                stroke="rgba(235,229,210,0.4)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x="596"
                y={180 - (ssAvg / ssMax) * 160 - 4}
                fontFamily="JetBrains Mono, monospace"
                fontSize="9"
                fill="rgba(235,229,210,0.55)"
                textAnchor="end"
              >
                Moy. {Math.round(ssAvg)}
              </text>
            </svg>
          )}
        </div>
      </div>

      {/* SECTION 05 — Stage performance */}
      <PerfSectionHeader index="05" label="Performance par stage" />
      <div
        style={{
          background: "#0d0d12",
          border: "1px solid rgba(235,229,210,0.06)",
          padding: 24,
        }}
      >
        {recordStages.length === 0 ? (
          <p style={perfPlaceholderStyle}>
            Aucune donnée de performance par stage. Lance des runs depuis
            l&apos;app OpMind.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 100px 100px 80px",
              gap: 12,
              alignItems: "center",
            }}
          >
            {["Stage / Drill", "Hit Factor", "Accuracy", "Best Time", "Tendance"].map(
              (h) => (
                <span
                  key={h}
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 9,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(235,229,210,0.45)",
                  }}
                >
                  {h}
                </span>
              )
            )}
            {recordStages.map((s) => (
              <div key={s.id} style={{ display: "contents" }}>
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#ebe5d2",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    paddingTop: 8,
                    borderTop: "1px solid rgba(235,229,210,0.06)",
                  }}
                >
                  {s.name}
                </span>
                {[
                  (s.hf_best ?? 0).toFixed(2),
                  "—",
                  "—",
                  "—",
                ].map((v, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      color:
                        i === 0
                          ? "#7A0000"
                          : "rgba(235,229,210,0.55)",
                      fontWeight: i === 0 ? 700 : 400,
                      paddingTop: 8,
                      borderTop: "1px solid rgba(235,229,210,0.06)",
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const perfSubHeaderStyle: CSSProperties = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(235,229,210,0.35)",
};

const perfPlaceholderStyle: CSSProperties = {
  marginTop: 16,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(235,229,210,0.35)",
  fontStyle: "italic",
};

function PerfSectionHeader({
  index,
  label,
}: {
  index: string;
  label: string;
}) {
  return (
    <div style={{ marginTop: 40, marginBottom: 16 }}>
      <h2
        style={{
          margin: 0,
          marginBottom: 10,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.35)",
        }}
      >
        Section {index} — {label}
      </h2>
      <div
        style={{ height: 1, background: "rgba(235,229,210,0.06)" }}
        aria-hidden
      />
    </div>
  );
}

function PerfKpi({
  label,
  value,
  trend,
  spark,
  sub,
}: {
  label: string;
  value: string;
  trend: number | null;
  spark: ReactNode;
  sub?: string;
}) {
  const trendColor =
    trend == null
      ? "rgba(235,229,210,0.45)"
      : trend >= 0
        ? "#5ad99b"
        : "#e84a3a";
  return (
    <div
      style={{
        background: "#0d0d12",
        border: "1px solid rgba(235,229,210,0.06)",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.45)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        {trend != null && (
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: trendColor,
              border: `1px solid ${trendColor}`,
              padding: "1px 5px",
              whiteSpace: "nowrap",
            }}
          >
            {trend >= 0 ? "+" : ""}
            {trend}%
          </span>
        )}
      </div>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 48,
          fontWeight: 700,
          color: "#ebe5d2",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.35)",
          }}
        >
          {sub || ""}
        </span>
        <span style={{ display: "inline-flex" }}>
          {spark || (
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                color: "rgba(235,229,210,0.25)",
              }}
            >
              —
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <svg width="20" height="6" viewBox="0 0 20 6">
        <line
          x1="0"
          y1="3"
          x2="20"
          y2="3"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "3 3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}

function IPSCTarget() {
  return (
    <svg
      width="120"
      height="160"
      viewBox="0 0 120 160"
      style={{ background: "#0a0a0c" }}
      aria-hidden
    >
      <rect
        x="10"
        y="10"
        width="100"
        height="140"
        fill="#1a1a22"
        stroke="rgba(235,229,210,0.35)"
        strokeWidth="2"
      />
      <rect
        x="35"
        y="22"
        width="50"
        height="40"
        fill="rgba(90,217,155,0.25)"
        stroke="#5ad99b"
        strokeWidth="1.5"
      />
      <text
        x="60"
        y="46"
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
        fontWeight="700"
        fill="#5ad99b"
        textAnchor="middle"
      >
        A
      </text>
      <line
        x1="10"
        y1="74"
        x2="110"
        y2="74"
        stroke="rgba(245,166,35,0.4)"
        strokeWidth="1"
      />
      <text
        x="20"
        y="92"
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
        fontWeight="700"
        fill="#f5a623"
      >
        C
      </text>
      <text
        x="20"
        y="120"
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
        fontWeight="700"
        fill="#e84a3a"
      >
        D
      </text>
    </svg>
  );
}

function ZoneBar({
  label,
  pct,
  count,
  color,
}: {
  label: string;
  pct: number;
  count: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr 80px",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 16,
          fontWeight: 700,
          color,
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </span>
      <div
        style={{
          position: "relative",
          height: 8,
          background: "rgba(235,229,210,0.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: color,
            opacity: 0.5,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.55)",
          textAlign: "right",
        }}
      >
        {pct}% · {count}
      </span>
    </div>
  );
}

function SplitsHistogram() {
  const bins = [
    0.15, 0.16, 0.17, 0.18, 0.19, 0.2, 0.22, 0.24, 0.27, 0.3, 0.33,
    0.36,
  ];
  const values = bins.map(() => 0);
  return (
    <svg
      viewBox="0 0 600 180"
      style={{ width: "100%", marginTop: 16 }}
      aria-hidden
    >
      <line
        x1="0"
        y1="160"
        x2="600"
        y2="160"
        stroke="rgba(235,229,210,0.06)"
      />
      {values.map((v, i) => {
        const barW = 600 / bins.length;
        const h = 4;
        const isTarget = bins[i] <= 0.2;
        return (
          <g key={i}>
            <rect
              x={i * barW + 2}
              y={160 - h}
              width={barW - 4}
              height={h}
              fill={isTarget ? "rgba(90,217,155,0.3)" : "rgba(122,0,0,0.3)"}
            />
            <text
              x={i * barW + barW / 2}
              y={175}
              fontFamily="JetBrains Mono, monospace"
              fontSize="8"
              fill="rgba(235,229,210,0.4)"
              textAnchor="middle"
            >
              {bins[i].toFixed(2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ──────────────  Placeholder view  ────────────── */

function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-barlow-condensed), system-ui, sans-serif",
          fontSize: 32,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          color: "#ebe5d2",
          margin: 0,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          marginTop: 24,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        Section à venir.
      </p>
    </div>
  );
}

/* ──────────────  Profile view  ────────────── */

type MagazineRow = { id: string; rounds: string };

function makeMagazineId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function ProfileView({
  profile,
  setProfile,
}: {
  profile: Profile | null;
  setProfile: (p: Profile) => void;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [role, setRole] = useState(profile?.role ?? "");
  const [club, setClub] = useState(profile?.club ?? "");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);
  const [pwdFeedback, setPwdFeedback] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);
  const [pwdSending, setPwdSending] = useState(false);
  const [authMeta, setAuthMeta] = useState<{
    created_at?: string;
    last_sign_in_at?: string;
  } | null>(null);

  const [magazinesRows, setMagazinesRows] = useState<MagazineRow[]>([]);
  const [magazinesSaving, setMagazinesSaving] = useState(false);
  const [magazinesFeedback, setMagazinesFeedback] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
        if (!cancelled && session?.user) {
          setAuthMeta({
            created_at: session.user.created_at,
            last_sign_in_at: session.user.last_sign_in_at,
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        const {
          data: { session },
        } = await sb.auth.getSession();
        if (!session || cancelled) return;
        const { data } = await sb
          .from("profiles")
          .select("profile_data")
          .eq("id", session.user.id)
          .maybeSingle();
        if (cancelled) return;
        const pd = (data?.profile_data as Record<string, unknown>) || {};
        const raw = Array.isArray(pd.magazines) ? pd.magazines : [];
        const rows: MagazineRow[] = raw
          .filter(
            (m): m is { rounds: unknown } =>
              m !== null && typeof m === "object" && "rounds" in m
          )
          .map((m) => ({
            id: makeMagazineId(),
            rounds:
              typeof m.rounds === "number" && m.rounds > 0
                ? String(m.rounds)
                : "",
          }));
        if (!cancelled) setMagazinesRows(rows);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function addMagazineRow() {
    setMagazinesRows((prev) => [...prev, { id: makeMagazineId(), rounds: "" }]);
  }
  function removeMagazineRow(id: string) {
    setMagazinesRows((prev) => prev.filter((m) => m.id !== id));
  }
  function updateMagazineRow(id: string, rounds: string) {
    setMagazinesRows((prev) =>
      prev.map((m) => (m.id === id ? { ...m, rounds } : m))
    );
  }

  async function onSaveMagazines() {
    if (magazinesSaving) return;
    setMagazinesSaving(true);
    setMagazinesFeedback(null);
    try {
      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session) {
        setMagazinesFeedback({ kind: "err", msg: "Session expirée." });
        setMagazinesSaving(false);
        return;
      }
      const { data: existing } = await sb
        .from("profiles")
        .select("profile_data")
        .eq("id", session.user.id)
        .maybeSingle();
      const currentPd =
        (existing?.profile_data as Record<string, unknown>) || {};
      const cleanMagazines: MagazineConfig[] = magazinesRows
        .map((m) => Number(m.rounds))
        .filter((r) => Number.isFinite(r) && r > 0)
        .map((r) => ({ rounds: r }));
      const newPd = { ...currentPd, magazines: cleanMagazines };
      const { error } = await sb
        .from("profiles")
        .update({ profile_data: newPd })
        .eq("id", session.user.id);
      if (error) {
        setMagazinesFeedback({
          kind: "err",
          msg: "Erreur — " + error.message,
        });
      } else {
        setMagazinesFeedback({ kind: "ok", msg: "Chargeurs sauvegardés." });
      }
    } catch {
      setMagazinesFeedback({
        kind: "err",
        msg: "Erreur — sauvegarde impossible.",
      });
    } finally {
      setMagazinesSaving(false);
    }
  }

  async function onSave() {
    if (saving) return;
    setSaving(true);
    setSaveFeedback(null);
    try {
      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session) {
        setSaveFeedback({ kind: "err", msg: "Session expirée." });
        setSaving(false);
        return;
      }
      const payload = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        role: role || null,
        club: club.trim() || null,
      };
      const { error } = await sb
        .from("profiles")
        .update(payload)
        .eq("id", session.user.id);
      if (error) {
        setSaveFeedback({ kind: "err", msg: "Erreur — " + error.message });
      } else {
        setSaveFeedback({ kind: "ok", msg: "Profil mis à jour." });
        const merged: Profile = {
          id: session.user.id,
          email: profile?.email ?? session.user.email ?? null,
          first_name: payload.first_name,
          last_name: payload.last_name,
          role: payload.role,
          club: payload.club,
        };
        setProfile(merged);
      }
    } catch {
      setSaveFeedback({ kind: "err", msg: "Erreur — sauvegarde impossible." });
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword() {
    if (pwdSending) return;
    setPwdSending(true);
    setPwdFeedback(null);
    try {
      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();
      const email = session?.user.email;
      if (!email) {
        setPwdFeedback({ kind: "err", msg: "Email indisponible." });
        setPwdSending(false);
        return;
      }
      const { error } = await sb.auth.resetPasswordForEmail(email);
      if (error) {
        setPwdFeedback({ kind: "err", msg: error.message });
      } else {
        setPwdFeedback({
          kind: "ok",
          msg: "Email envoyé. Vérifie ta boîte mail.",
        });
      }
    } catch {
      setPwdFeedback({ kind: "err", msg: "Erreur — réessaie plus tard." });
    } finally {
      setPwdSending(false);
    }
  }

  async function onLogoutAll() {
    try {
      await getSupabase().auth.signOut({ scope: "global" });
    } catch {
      // ignore
    }
    router.push("/login");
  }

  async function onDeleteAccount() {
    if (!window.confirm("Cette action est irréversible.")) return;
    try {
      await getSupabase().rpc("delete_user");
    } catch {
      // ignore — RPC may not exist yet
    }
    try {
      await getSupabase().auth.signOut();
    } catch {
      // ignore
    }
    router.push("/login");
  }

  const ROLES = ROLE_OPTIONS;

  const roleLabel =
    ROLES.find((r) => r.value === (profile?.role ?? ""))?.label || "—";

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-barlow-condensed), system-ui, sans-serif",
          fontSize: 32,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          color: "#ebe5d2",
          margin: 0,
        }}
      >
        Mon profil
      </h1>

      {/* ── Section 1 — Identité ── */}
      <ProfileSectionTitle>Mon profil</ProfileSectionTitle>
      <div
        style={{
          background: "#131318",
          border: "1px solid rgba(235,229,210,0.08)",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 20,
          }}
        >
          <Field label="Prénom">
            <TextInput value={firstName} onChange={setFirstName} />
          </Field>
          <Field label="Nom">
            <TextInput value={lastName} onChange={setLastName} />
          </Field>
          <Field label="Email" full>
            <TextInput
              value={profile?.email ?? ""}
              onChange={() => undefined}
              type="email"
              disabled
            />
          </Field>
          <Field label="Rôle">
            <SelectInput value={role} onChange={setRole} options={ROLES} />
          </Field>
          <Field label="Club (optionnel)">
            <TextInput value={club} onChange={setClub} />
          </Field>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={{
            marginTop: 24,
            width: "100%",
            background: "#7A0000",
            color: "#fff",
            border: "none",
            padding: "14px 16px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            transition: "background .15s",
          }}
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>

        {saveFeedback && (
          <p
            role="alert"
            style={{
              marginTop: 12,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: saveFeedback.kind === "ok" ? "#5ad99b" : "#e84a3a",
            }}
          >
            {saveFeedback.msg}
          </p>
        )}
      </div>

      {/* ── Section 2 — Sécurité ── */}
      <ProfileSectionTitle>Sécurité</ProfileSectionTitle>
      <div
        style={{
          background: "#131318",
          border: "1px solid rgba(235,229,210,0.08)",
          padding: 24,
        }}
      >
        <p
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.04em",
            color: "rgba(235,229,210,0.55)",
            margin: 0,
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          Tu recevras un email pour définir un nouveau mot de passe.
        </p>
        <button
          type="button"
          onClick={onChangePassword}
          disabled={pwdSending}
          style={{
            background: "transparent",
            border: "1px solid rgba(235,229,210,0.2)",
            color: "#ebe5d2",
            padding: "12px 18px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: pwdSending ? "not-allowed" : "pointer",
            opacity: pwdSending ? 0.6 : 1,
          }}
        >
          {pwdSending ? "Envoi..." : "Changer mon mot de passe"}
        </button>
        {pwdFeedback && (
          <p
            role="alert"
            style={{
              marginTop: 12,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: pwdFeedback.kind === "ok" ? "#5ad99b" : "#e84a3a",
            }}
          >
            {pwdFeedback.msg}
          </p>
        )}
      </div>

      {/* ── Section 3 — Mes chargeurs ── */}
      <ProfileSectionTitle>Mes chargeurs</ProfileSectionTitle>
      <div
        style={{
          background: "#131318",
          border: "1px solid rgba(235,229,210,0.08)",
          padding: 24,
        }}
      >
        {magazinesRows.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.55)",
            }}
          >
            Aucun chargeur configuré.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {magazinesRows.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 40px",
                  gap: 16,
                  alignItems: "end",
                }}
              >
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 12,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#ebe5d2",
                    paddingBottom: 8,
                  }}
                >
                  Chargeur {i + 1}
                </span>
                <Field label="Capacité (coups)">
                  <NumberInput
                    value={m.rounds}
                    onChange={(v) => updateMagazineRow(m.id, v)}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeMagazineRow(m.id)}
                  aria-label={`Supprimer le chargeur ${i + 1}`}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(232,74,58,0.4)",
                    color: "#e84a3a",
                    width: 32,
                    height: 32,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 13,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addMagazineRow}
          style={{
            marginTop: 16,
            width: "100%",
            background: "transparent",
            border: "1px dashed rgba(235,229,210,0.25)",
            color: "rgba(235,229,210,0.65)",
            padding: "12px 16px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          + Ajouter un chargeur
        </button>

        <button
          type="button"
          onClick={onSaveMagazines}
          disabled={magazinesSaving}
          style={{
            marginTop: 12,
            width: "100%",
            background: "#7A0000",
            color: "#fff",
            border: "none",
            padding: "14px 16px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor: magazinesSaving ? "not-allowed" : "pointer",
            opacity: magazinesSaving ? 0.6 : 1,
          }}
        >
          {magazinesSaving ? "Sauvegarde..." : "Sauvegarder les chargeurs"}
        </button>

        {magazinesFeedback && (
          <p
            role="alert"
            style={{
              marginTop: 12,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: magazinesFeedback.kind === "ok" ? "#5ad99b" : "#e84a3a",
            }}
          >
            {magazinesFeedback.msg}
          </p>
        )}
      </div>

      {/* ── Section 4 — Zone critique ── */}
      <ProfileSectionTitle danger>Zone critique</ProfileSectionTitle>
      <div
        style={{
          background: "#131318",
          border: "1px solid rgba(232,74,58,0.2)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={onLogoutAll}
          style={{
            background: "transparent",
            border: "1px solid rgba(235,229,210,0.2)",
            color: "#ebe5d2",
            padding: "12px 18px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Se déconnecter de tous les appareils
        </button>
        <button
          type="button"
          onClick={onDeleteAccount}
          style={{
            background: "transparent",
            border: "1px solid #e84a3a",
            color: "#e84a3a",
            padding: "12px 18px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Supprimer mon compte
        </button>
      </div>

      {/* ── Section 5 — Statistiques du compte ── */}
      <ProfileSectionTitle>Statistiques du compte</ProfileSectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        <ProfileStatCard
          label="Membre depuis"
          value={formatDate(authMeta?.created_at)}
        />
        <ProfileStatCard
          label="Dernière connexion"
          value={formatDate(authMeta?.last_sign_in_at)}
        />
        <ProfileStatCard label="Rôle" value={roleLabel} />
      </div>
    </div>
  );
}

function ProfileSectionTitle({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <h2
      style={{
        marginTop: 40,
        marginBottom: 16,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 10,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: danger ? "#e84a3a" : "rgba(235,229,210,0.55)",
      }}
    >
      {children}
    </h2>
  );
}

function Field({
  label,
  full = false,
  children,
}: {
  label: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      style={{
        display: "block",
        gridColumn: full ? "1 / -1" : "auto",
      }}
    >
      <span
        style={{
          display: "block",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.55)",
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder,
  list,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  list?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      list={list}
      autoComplete={list ? "off" : undefined}
      style={{
        width: "100%",
        background: "#0a0a0c",
        border: "none",
        borderBottom: "1px solid rgba(235,229,210,0.2)",
        color: disabled ? "rgba(235,229,210,0.55)" : "#ebe5d2",
        padding: "8px 4px",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        letterSpacing: "0.04em",
        outline: "none",
        cursor: disabled ? "not-allowed" : "text",
      }}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        appearance: "none",
        background: "#0a0a0c",
        border: "none",
        borderBottom: "1px solid rgba(235,229,210,0.2)",
        color: "#ebe5d2",
        padding: "8px 28px 8px 4px",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        letterSpacing: "0.04em",
        outline: "none",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 4px center",
        backgroundSize: "12px",
      }}
    >
      <option value="" disabled>
        Choisir
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ProfileStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#131318",
        border: "1px solid rgba(235,229,210,0.08)",
        padding: 24,
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.55)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-barlow-condensed), system-ui, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#ebe5d2",
          marginTop: 12,
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ──────────────  Create session view  ────────────── */

const TARGET_TYPES: {
  value: TargetType;
  label: string;
  subtitle: string;
}[] = [
  { value: "rings", label: "Anneaux", subtitle: "10 zones · ISSF" },
  { value: "silhouette", label: "IPSC", subtitle: "A · C · D zones" },
  {
    value: "plates",
    label: "Steel / Popper",
    subtitle: "Plate · Bowling",
  },
  {
    value: "silhouette_police",
    label: "Silhouette",
    subtitle: "Police · Défense",
  },
];

const STEPS: { num: string; label: string }[] = [
  { num: "01", label: "Identité" },
  { num: "02", label: "Cible" },
  { num: "03", label: "Déroulement" },
  { num: "04", label: "Munitions" },
  { num: "05", label: "Contexte" },
];

type DrillDraft = {
  id: string;
  name: string;
  position: string;
  zone: "a" | "c" | "all";
  shots: number;
  parTime: string;
  reps: number;
};

const ZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "a", label: "A-Zone" },
  { value: "c", label: "C-Zone" },
  { value: "all", label: "Tout" },
];

const EQUIPMENT_ITEMS: { key: string; label: string }[] = [
  { key: "holster_ipsc", label: "Holster IPSC" },
  { key: "chargeurs", label: "Chargeurs" },
  { key: "casque_actif", label: "Casque actif" },
  { key: "red_dot", label: "Red Dot" },
  { key: "timer_pact", label: "Timer PACT" },
  { key: "camera", label: "Caméra" },
  { key: "pouch_reload", label: "Pouch Reload" },
  { key: "plaque_balistique", label: "Plaque balistique" },
];

const WEATHER_OPTIONS: { value: string; label: string }[] = [
  { value: "indoor_controlled", label: "Indoor · contrôlé" },
  { value: "outdoor_sunny", label: "Outdoor · ensoleillé" },
  { value: "outdoor_cloudy", label: "Outdoor · nuageux" },
  { value: "outdoor_rain", label: "Outdoor · pluie" },
  { value: "outdoor_wind", label: "Outdoor · vent" },
];

const LIGHTING_OPTIONS: { value: string; label: string }[] = [
  { value: "neon_stand", label: "Néon stand" },
  { value: "natural", label: "Lumière naturelle" },
  { value: "low", label: "Faible luminosité" },
  { value: "night", label: "Nuit" },
];

const PHYSICAL_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: "fresh", label: "Frais · début de séance" },
  { value: "warmed", label: "Échauffé" },
  { value: "tired", label: "Fatigué" },
  { value: "post_comp", label: "Post-compétition" },
];

function makeDrillId(): string {
  return `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyDrill(): DrillDraft {
  return {
    id: makeDrillId(),
    name: "",
    position: "",
    zone: "all",
    shots: 0,
    parTime: "",
    reps: 1,
  };
}

function parseDrillsFromInstructions(text: string): DrillDraft[] {
  if (!text || !text.trim()) return [emptyDrill()];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((d: unknown, i: number) => {
        const dd = (d || {}) as Record<string, unknown>;
        const zone = dd.zone;
        return {
          id:
            typeof dd.id === "string"
              ? dd.id
              : `d-${Date.now()}-${i}`,
          name: typeof dd.name === "string" ? dd.name : "",
          position: typeof dd.position === "string" ? dd.position : "",
          zone:
            zone === "a" || zone === "c" || zone === "all"
              ? (zone as "a" | "c" | "all")
              : "all",
          shots: Number(dd.shots) || 0,
          parTime: typeof dd.parTime === "string" ? dd.parTime : "",
          reps: Math.max(1, Number(dd.reps) || 1),
        };
      });
    }
  } catch {
    // not JSON — legacy plaintext fallback
  }
  return [{ ...emptyDrill(), name: text.slice(0, 80) }];
}

function CreateSessionView({
  setView,
  initialData,
  editingId,
  onSessionSaved,
}: {
  setView: (v: View) => void;
  initialData?: Session | null;
  editingId?: string | null;
  onSessionSaved?: (s: Session, isUpdate: boolean) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  // Legacy fields (warmup/blocks/cooldown) are folded into instructions when editing an old session
  const initialInstructions = (() => {
    if (!initialData) return "";
    if (initialData.instructions) return initialData.instructions;
    const parts: string[] = [];
    if (initialData.warmup?.exercises) {
      parts.push(
        `Échauffement (${initialData.warmup.duration ?? 0} min) — ${initialData.warmup.exercises}`
      );
    }
    if (Array.isArray(initialData.blocks)) {
      initialData.blocks.forEach((b, i) => {
        const bits: string[] = [
          `Bloc ${i + 1}: ${b?.name || "—"} (${b?.shots ?? 0} coups)`,
        ];
        if (b?.objective) bits.push(`Objectif: ${b.objective}`);
        if (b?.notes) bits.push(`Notes: ${b.notes}`);
        parts.push(bits.join(" — "));
      });
    }
    if (initialData.cooldown?.notes) {
      parts.push(
        `Restitution (${initialData.cooldown.duration ?? 0} min) — ${initialData.cooldown.notes}`
      );
    }
    return parts.join("\n");
  })();

  const [name, setName] = useState<string>(initialData?.name ?? "");
  const [date, setDate] = useState<string>(
    (initialData?.date ?? "").slice(0, 10) || today
  );
  const [objective, setObjective] = useState<string>(
    initialData?.objective ?? ""
  );
  const [drills, setDrills] = useState<DrillDraft[]>(() =>
    parseDrillsFromInstructions(initialInstructions)
  );
  const [rounds, setRounds] = useState<string>(
    initialData?.rounds != null
      ? String(initialData.rounds)
      : initialData?.total_shots != null
        ? String(initialData.total_shots)
        : ""
  );
  const [targetType, setTargetType] = useState<TargetType>(
    initialData?.target_type ?? "rings"
  );
  const [dryFire, setDryFire] = useState<boolean>(
    Boolean(initialData?.dry_fire)
  );
  const [tags, setTags] = useState<string>(
    Array.isArray(initialData?.tags) ? initialData!.tags!.join(", ") : ""
  );

  const [profileMagazines, setProfileMagazines] = useState<
    MagazineConfig[] | null
  >(null);
  const [magazinesLoading, setMagazinesLoading] = useState(true);
  const [magQuantities, setMagQuantities] = useState<Record<number, string>>(
    {}
  );

  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);

  // Multi-step + side panel state
  const [step, setStep] = useState<number>(1);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(
    () => new Set([1])
  );
  const [stand, setStand] = useState<string>(initialData?.stand ?? "");
  const [standSuggestions, setStandSuggestions] = useState<string[]>([]);
  const [distance, setDistance] = useState<string>(
    initialData?.distance_m != null ? String(initialData.distance_m) : ""
  );
  const [coachingMode, setCoachingMode] = useState<boolean>(
    Boolean(initialData?.coach_mode)
  );
  const [selectedShooters, setSelectedShooters] = useState<string[]>(
    Array.isArray(initialData?.coach_shooter_ids)
      ? initialData!.coach_shooter_ids!
      : []
  );
  const [userInitials, setUserInitials] = useState<string>("RO");
  const [weapon, setWeapon] = useState<string>(initialData?.weapon ?? "");
  const [weaponSuggestions, setWeaponSuggestions] = useState<string[]>([]);
  const [caliber, setCaliber] = useState<string>(initialData?.caliber ?? "");
  const [grains, setGrains] = useState<string>(initialData?.grains ?? "");
  const [pf, setPf] = useState<string>(
    initialData?.power_factor != null ? String(initialData.power_factor) : ""
  );
  const [equipment, setEquipment] = useState<string[]>(
    Array.isArray(initialData?.equipment) ? initialData!.equipment! : []
  );
  const [weather, setWeather] = useState<string>(
    initialData?.weather ?? "indoor_controlled"
  );
  const [lighting, setLighting] = useState<string>(
    initialData?.lighting ?? "neon_stand"
  );
  const [physicalState, setPhysicalState] = useState<string>(
    initialData?.physical_state ?? "fresh"
  );
  const [contextNotes, setContextNotes] = useState<string>(
    initialData?.context_notes ?? ""
  );
  const [templateSaving, setTemplateSaving] = useState(false);
  const [roundsAutoSync, setRoundsAutoSync] = useState<boolean>(
    initialData?.rounds == null && initialData?.total_shots == null
  );

  // Inject blink keyframe once
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("opmind-blink-style")) return;
    const style = document.createElement("style");
    style.id = "opmind-blink-style";
    style.textContent =
      "@keyframes opmind-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }";
    document.head.appendChild(style);
  }, []);

  // Load magazines from profile_data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        const {
          data: { session },
        } = await sb.auth.getSession();
        if (!session || cancelled) {
          if (!cancelled) setMagazinesLoading(false);
          return;
        }
        const { data } = await sb
          .from("profiles")
          .select("profile_data")
          .eq("id", session.user.id)
          .maybeSingle();
        if (cancelled) return;
        const pd = (data?.profile_data as Record<string, unknown>) || {};
        const raw = Array.isArray(pd.magazines) ? pd.magazines : [];
        const mags: MagazineConfig[] = raw
          .filter(
            (m): m is { rounds: unknown } =>
              m !== null && typeof m === "object" && "rounds" in m
          )
          .map((m) => ({ rounds: Number(m.rounds) || 0 }))
          .filter((m) => m.rounds > 0);
        setProfileMagazines(mags);

        const weapons: string[] = [];
        const brand =
          typeof pd.weaponBrand === "string" ? pd.weaponBrand.trim() : "";
        const model =
          typeof pd.weaponModel === "string" ? pd.weaponModel.trim() : "";
        if (brand && model) weapons.push(`${brand} ${model}`);
        if (Array.isArray(pd.weapons)) {
          for (const raw of pd.weapons) {
            if (!raw || typeof raw !== "object") continue;
            const w = raw as { brand?: unknown; model?: unknown };
            const wb = typeof w.brand === "string" ? w.brand.trim() : "";
            const wm = typeof w.model === "string" ? w.model.trim() : "";
            if (wb && wm) weapons.push(`${wb} ${wm}`);
          }
        }
        if (!cancelled) {
          setWeaponSuggestions(
            Array.from(new Set(weapons.filter(Boolean)))
          );
        }
      } catch {
        setProfileMagazines([]);
      } finally {
        if (!cancelled) setMagazinesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Seed quantities once magazines arrive — when editing, best-effort distribute counts by rounds value
  useEffect(() => {
    if (!profileMagazines) return;
    const init: Record<number, string> = {};
    if (initialData?.magazines && initialData.magazines.length > 0) {
      const counts = new Map<number, number>();
      for (const m of initialData.magazines) {
        counts.set(m.rounds, (counts.get(m.rounds) || 0) + 1);
      }
      const assigned = new Set<number>();
      profileMagazines.forEach((m, i) => {
        if (!assigned.has(m.rounds) && counts.has(m.rounds)) {
          init[i] = String(counts.get(m.rounds));
          assigned.add(m.rounds);
        } else {
          init[i] = "";
        }
      });
    } else {
      profileMagazines.forEach((_, i) => {
        init[i] = "";
      });
    }
    setMagQuantities(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileMagazines]);

  // Load profile (for initials + role) + assigned shooters + stand history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        const {
          data: { session },
        } = await sb.auth.getSession();
        if (!session || cancelled) return;
        const userId = session.user.id;

        try {
          const { data: prof } = await sb
            .from("profiles")
            .select("first_name,last_name,role")
            .eq("id", userId)
            .maybeSingle();
          if (cancelled) return;
          const profRow = prof as {
            first_name?: string | null;
            last_name?: string | null;
            role?: string | null;
          } | null;
          const fn = (profRow?.first_name || "").trim();
          const ln = (profRow?.last_name || "").trim();
          const initials =
            ((fn.charAt(0) || "") + (ln.charAt(0) || "")).toUpperCase() || "RO";
          if (!cancelled) setUserInitials(initials);
        } catch {
          // profiles select failed
        }

        try {
          const { data: standRows } = await sb
            .from("sessions")
            .select("stand")
            .eq("user_id", userId)
            .not("stand", "is", null)
            .limit(50);
          if (!cancelled && Array.isArray(standRows)) {
            const set = new Set<string>();
            for (const r of standRows as { stand?: unknown }[]) {
              if (typeof r.stand === "string" && r.stand.trim()) {
                set.add(r.stand.trim());
              }
            }
            setStandSuggestions(Array.from(set));
          }
        } catch {
          // stand column missing
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const roundsNum = Number(rounds) || 0;
  const tagsArr = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const usedMagazines: MagazineConfig[] = profileMagazines
    ? profileMagazines.flatMap((m, i) => {
        const qty = Number(magQuantities[i]) || 0;
        return Array.from({ length: qty }, () => ({ rounds: m.rounds }));
      })
    : [];
  const totalCapacity = usedMagazines.reduce((s, m) => s + m.rounds, 0);
  const maxCapacity =
    profileMagazines && profileMagazines.length > 0
      ? Math.max(...profileMagazines.map((m) => m.rounds))
      : 0;
  const magazinesNeeded =
    roundsNum > 0 && maxCapacity > 0 ? Math.ceil(roundsNum / maxCapacity) : 0;
  const insufficientCapacity =
    roundsNum > 0 && totalCapacity > 0 && totalCapacity < roundsNum;

  const totalDrillShots = drills.reduce(
    (s, d) =>
      s + (Number(d.shots) || 0) * Math.max(1, Number(d.reps) || 1),
    0
  );
  const totalDrillSeconds = drills.reduce((s, d) => {
    const par = parseFloat(d.parTime) || 0;
    const reps = Math.max(1, Number(d.reps) || 1);
    return s + par * reps * 1.5;
  }, 0);
  const totalDrillMinutes =
    totalDrillSeconds > 0 ? Math.max(1, Math.round(totalDrillSeconds / 60)) : 0;
  const hasDrillContent = drills.some(
    (d) => d.name.trim() !== "" || (Number(d.shots) || 0) > 0
  );

  // Auto-sync rounds from drill total when user has not manually edited
  useEffect(() => {
    if (roundsAutoSync && totalDrillShots > 0) {
      setRounds(String(totalDrillShots));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalDrillShots]);

  const criticalFields: { label: string; filled: boolean }[] = [
    { label: "Nom de la séance", filled: !!name.trim() },
    { label: "Type de cible", filled: !!targetType },
    { label: "Déroulement", filled: hasDrillContent },
    { label: "Cartouches", filled: dryFire || roundsNum > 0 },
  ];
  const filledCount = criticalFields.filter((f) => f.filled).length;
  const completionPct =
    criticalFields.length === 0
      ? 0
      : Math.round((filledCount / criticalFields.length) * 100);
  const missingFields = criticalFields
    .filter((f) => !f.filled)
    .map((f) => f.label);
  const canSubmit = filledCount === criticalFields.length;

  function stepCompleted(n: number): boolean {
    switch (n) {
      case 1:
        return !!name.trim();
      case 2:
        return !!targetType;
      case 3:
        return hasDrillContent;
      case 4:
        return dryFire || roundsNum > 0;
      case 5:
        return true;
      default:
        return false;
    }
  }

  function goToStep(target: number) {
    if (visitedSteps.has(target)) setStep(target);
  }

  function nextStep() {
    if (step < STEPS.length) {
      const n = step + 1;
      setVisitedSteps((prev) => {
        const next = new Set(prev);
        next.add(n);
        return next;
      });
      setStep(n);
    }
  }

  function prevStep() {
    if (step > 1) setStep(step - 1);
  }

  function toggleEquipment(key: string) {
    setEquipment((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  function setRoundsManual(v: string) {
    setRoundsAutoSync(false);
    setRounds(v);
  }

  function resetAll() {
    setName("");
    setDate(today);
    setObjective("");
    setDrills([emptyDrill()]);
    setRounds("");
    setRoundsAutoSync(true);
    setTargetType("rings");
    setDryFire(false);
    setTags("");
    setStand("");
    setDistance("");
    setCoachingMode(false);
    setSelectedShooters([]);
    setWeapon("");
    setCaliber("");
    setGrains("");
    setPf("");
    setEquipment([]);
    setWeather("indoor_controlled");
    setLighting("neon_stand");
    setPhysicalState("fresh");
    setContextNotes("");
    if (profileMagazines) {
      const init: Record<number, string> = {};
      profileMagazines.forEach((_, i) => {
        init[i] = "";
      });
      setMagQuantities(init);
    }
    setFeedback(null);
    setSavedOk(false);
    setStep(1);
    setVisitedSteps(new Set([1]));
  }

  function validateForm(): string | null {
    if (!name.trim()) return "Nom de séance obligatoire.";
    if (!hasDrillContent)
      return "Au moins un drill avec un nom ou des coups requis.";
    if (!dryFire && !roundsNum) return "Nombre de cartouches obligatoire.";
    return null;
  }

  function serializeDrills(): string {
    return JSON.stringify(
      drills.map((d) => ({
        id: d.id,
        name: d.name.trim(),
        position: d.position.trim(),
        zone: d.zone,
        shots: Number(d.shots) || 0,
        parTime: d.parTime.trim(),
        reps: Math.max(1, Number(d.reps) || 1),
      }))
    );
  }

  function addDrill() {
    setDrills((prev) => [...prev, emptyDrill()]);
  }
  function removeDrill(id: string) {
    setDrills((prev) =>
      prev.length <= 1 ? prev : prev.filter((d) => d.id !== id)
    );
  }
  function updateDrill(id: string, patch: Partial<DrillDraft>) {
    setDrills((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }

  function generateId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function onExportJson() {
    const err = validateForm();
    if (err) {
      setFeedback({ kind: "err", msg: err });
      setSavedOk(false);
      return;
    }
    setFeedback(null);
    const now = new Date().toISOString();
    const sessionObj = {
      id: generateId(),
      type: "custom" as const,
      name: name.trim(),
      objective: objective.trim() || undefined,
      instructions: serializeDrills(),
      rounds: roundsNum,
      magazines: usedMagazines,
      dryFire,
      useTimer: false,
      date: now.slice(0, 10),
      tags: tagsArr,
      createdAt: now,
      updatedAt: now,
      targetType,
    };
    const payload = {
      version: "1.0" as const,
      exportedAt: now,
      source: "opmind" as const,
      sessions: [sessionObj],
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `opmind_${slugifySessionName(name)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback({ kind: "ok", msg: "Fichier JSON téléchargé." });
    } catch {
      setFeedback({ kind: "err", msg: "Échec du téléchargement." });
    }
  }

  async function onSaveTemplate() {
    if (templateSaving) return;
    if (!name.trim()) {
      setFeedback({
        kind: "err",
        msg: "Nom de séance obligatoire pour le template.",
      });
      return;
    }
    setFeedback(null);
    setTemplateSaving(true);
    try {
      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session) {
        setFeedback({ kind: "err", msg: "Session expirée." });
        setTemplateSaving(false);
        return;
      }
      const payload = {
        user_id: session.user.id,
        name: name.trim(),
        type: "custom",
        objective: objective.trim() || null,
        instructions: serializeDrills(),
        rounds: roundsNum,
        magazines: usedMagazines,
        dry_fire: dryFire,
        use_timer: false,
        tags: tagsArr,
        target_type: targetType,
        distance_m: Number(distance) > 0 ? Number(distance) : null,
        stand: stand.trim() || null,
        weapon: weapon.trim() || null,
        caliber: caliber.trim() || null,
        grains: grains.trim() || null,
        power_factor: Number(pf) > 0 ? Number(pf) : null,
        equipment,
        weather,
        lighting,
        physical_state: physicalState,
        context_notes: contextNotes.trim() || null,
      };
      const { error } = await sb.from("session_templates").insert(payload);
      if (error) {
        setFeedback({ kind: "err", msg: "Template — " + error.message });
      } else {
        setFeedback({ kind: "ok", msg: "Template enregistré." });
      }
    } catch {
      setFeedback({
        kind: "err",
        msg: "Template — sauvegarde impossible.",
      });
    } finally {
      setTemplateSaving(false);
    }
  }

  async function onSave() {
    if (saving) return;
    const err = validateForm();
    if (err) {
      setFeedback({ kind: "err", msg: err });
      setSavedOk(false);
      return;
    }
    setFeedback(null);
    setSavedOk(false);
    setSaving(true);
    try {
      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session) {
        setFeedback({ kind: "err", msg: "Session expirée." });
        setSaving(false);
        return;
      }

      const payload = {
        user_id: session.user.id,
        name: name.trim(),
        date,
        type: "custom",
        objective: objective.trim() || null,
        instructions: serializeDrills(),
        rounds: roundsNum,
        magazines: usedMagazines,
        dry_fire: dryFire,
        use_timer: false,
        tags: tagsArr,
        target_type: targetType,
        distance_m: Number(distance) > 0 ? Number(distance) : null,
        total_shots: roundsNum,
        stand: stand.trim() || null,
        coach_mode: coachingMode,
        coach_shooter_ids: coachingMode ? selectedShooters : [],
        weapon: weapon.trim() || null,
        caliber: caliber.trim() || null,
        grains: grains.trim() || null,
        power_factor: Number(pf) > 0 ? Number(pf) : null,
        equipment,
        weather,
        lighting,
        physical_state: physicalState,
        context_notes: contextNotes.trim() || null,
      };

      if (editingId) {
        const { error } = await sb
          .from("sessions")
          .update(payload)
          .eq("id", editingId);
        if (error) {
          setFeedback({ kind: "err", msg: "Erreur — " + error.message });
        } else {
          setSavedOk(true);
          setFeedback({ kind: "ok", msg: "Séance mise à jour." });
          if (onSessionSaved) {
            onSessionSaved(
              { id: editingId, ...payload } as unknown as Session,
              true
            );
          }
        }
      } else {
        const { data, error } = await sb
          .from("sessions")
          .insert(payload)
          .select()
          .maybeSingle();
        if (error) {
          setFeedback({ kind: "err", msg: "Erreur — " + error.message });
        } else {
          setSavedOk(true);
          setFeedback({ kind: "ok", msg: "Séance sauvegardée." });
          if (data && onSessionSaved) {
            onSessionSaved(data as Session, false);
          }
        }
      }
    } catch {
      setFeedback({ kind: "err", msg: "Erreur — sauvegarde impossible." });
    } finally {
      setSaving(false);
    }
  }

  const titleVerb = editingId ? "Modifier une" : "Créer une";
  const editionLabel = editingId ? "Édition" : "Création";
  const nextDisabled = !name.trim();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        margin: "-32px -40px",
        minHeight: "calc(100vh - 48px)",
      }}
    >
      {/* Main column */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "32px 40px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Stepper */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(235,229,210,0.06)",
          }}
        >
          {STEPS.map((s, i) => {
            const num = i + 1;
            const active = step === num;
            const isVisited = visitedSteps.has(num);
            const completed = num !== step && isVisited && stepCompleted(num);
            const numColor = completed
              ? "#5ad99b"
              : active
                ? "#7A0000"
                : "rgba(235,229,210,0.3)";
            const labelColor = active
              ? "#ebe5d2"
              : completed
                ? "rgba(235,229,210,0.65)"
                : "rgba(235,229,210,0.3)";
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => goToStep(num)}
                disabled={!isVisited}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: active
                    ? "2px solid #7A0000"
                    : "2px solid transparent",
                  marginBottom: -1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 6,
                  cursor: isVisited ? "pointer" : "default",
                  textAlign: "left",
                  transition: "border-color .15s, color .15s",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    color: numColor,
                    letterSpacing: "0.06em",
                  }}
                >
                  {completed ? <CheckIcon /> : s.num}
                </span>
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: labelColor,
                  }}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div style={{ marginTop: 32, flex: 1 }}>
          {step === 1 && (
            <div>
              <h1
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 48,
                  fontWeight: 700,
                  color: "#ebe5d2",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                {titleVerb}{" "}
                <span
                  style={{ color: "#7A0000", fontStyle: "italic" }}
                >
                  séance.
                </span>
              </h1>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(235,229,210,0.45)",
                }}
              >
                {formatDate(today)} · {editionLabel} · {userInitials}
              </div>

              <div
                style={{
                  ...sectionCardStyle,
                  marginTop: 32,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 20,
                }}
              >
                <Field label="Nom de la séance" full>
                  <TextInput
                    value={name}
                    onChange={setName}
                    placeholder="Ex. Transitions rapides 25m — bloc cible C"
                  />
                </Field>
                <Field label="Date">
                  <DateInput value={date} onChange={setDate} />
                </Field>
                <Field label="Stand">
                  <TextInput
                    value={stand}
                    onChange={setStand}
                    placeholder="Stand 03 · Indoor · Lyon"
                    list="opmind-stand-suggestions"
                  />
                  <datalist id="opmind-stand-suggestions">
                    {standSuggestions.map((s, i) => (
                      <option key={i} value={s} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Type de séance" full>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <ModeCard
                      active={!dryFire}
                      onClick={() => setDryFire(false)}
                      bg="#7A0000"
                      title="Tir réel"
                      subtitle="Munitions live · Stand homologué"
                      icon={<IconTarget />}
                    />
                    <ModeCard
                      active={dryFire}
                      onClick={() => setDryFire(true)}
                      bg="#1a3a5c"
                      title="Dry fire"
                      subtitle="À sec · Sans munitions"
                      icon={<IconLock />}
                    />
                  </div>
                </Field>
                <Field label="Tireur(s)" full>
                  <div
                    style={{ display: "flex", gap: 8, marginBottom: 16 }}
                  >
                    <ToggleButton
                      active={!coachingMode}
                      activeBg="#7A0000"
                      onClick={() => setCoachingMode(false)}
                      label="Solo"
                    />
                    <ToggleButton
                      active={coachingMode}
                      activeBg="#7A0000"
                      onClick={() => setCoachingMode(true)}
                      label="Coaching"
                    />
                  </div>
                  {coachingMode && (
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "rgba(235,229,210,0.45)",
                      }}
                    >
                      Gère tes tireurs depuis l&apos;onglet Mes tireurs du
                      dashboard.
                    </p>
                  )}
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#ebe5d2",
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                }}
              >
                Sélectionne ta{" "}
                <span style={{ color: "#7A0000", fontStyle: "italic" }}>
                  cible.
                </span>
              </h2>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(235,229,210,0.45)",
                }}
              >
                Type de cible · distance de tir
              </div>

              <div
                style={{
                  marginTop: 32,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 16,
                }}
              >
                {TARGET_TYPES.filter((t) => t.value !== "none").map((t) => {
                  const isActive = targetType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTargetType(t.value)}
                      style={{
                        position: "relative",
                        height: 160,
                        background: isActive ? "#1a0a0a" : "#131318",
                        border: isActive
                          ? "2px solid #7A0000"
                          : "1px solid rgba(235,229,210,0.06)",
                        padding: 24,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 12,
                        textAlign: "left",
                        transition: "background .15s, border-color .15s",
                      }}
                    >
                      {isActive && <CheckBadge />}
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-start",
                        }}
                      >
                        <TargetIllustration value={t.value} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: FONT_DISPLAY,
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#ebe5d2",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            lineHeight: 1,
                          }}
                        >
                          {t.label}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 10,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "rgba(235,229,210,0.45)",
                          }}
                        >
                          {t.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  ...sectionCardStyle,
                  marginTop: 24,
                  display: "grid",
                  gridTemplateColumns: "200px 1fr",
                  gap: 20,
                  alignItems: "end",
                }}
              >
                <Field label="Distance (m)">
                  <NumberInput value={distance} onChange={setDistance} />
                </Field>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    paddingBottom: 4,
                    color: "rgba(235,229,210,0.45)",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Visible en temps réel dans le panneau récap
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#ebe5d2",
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                }}
              >
                Structure ton{" "}
                <span style={{ color: "#7A0000", fontStyle: "italic" }}>
                  déroulement.
                </span>
              </h2>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(235,229,210,0.45)",
                }}
              >
                Objectif · Drills · Séquence d&apos;exécution
              </div>

              {/* OBJECTIF */}
              <div style={{ marginTop: 32 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "rgba(235,229,210,0.35)",
                    }}
                  >
                    Objectif
                  </span>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(235,229,210,0.55)",
                      border: "1px solid rgba(235,229,210,0.2)",
                      padding: "2px 8px",
                    }}
                  >
                    Optionnel
                  </span>
                </div>
                <div style={sectionCardStyle}>
                  <TextArea
                    value={objective}
                    onChange={setObjective}
                    rows={3}
                    placeholder="Ex. Travailler la transition T2 → T3 sous 0.35s. Confirmer le call shot avant de dégainer."
                  />
                </div>
              </div>

              {/* DRILLS */}
              <div style={{ marginTop: 32 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "rgba(235,229,210,0.35)",
                    }}
                  >
                    Drills · Séquence d&apos;exécution
                  </span>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(235,229,210,0.55)",
                    }}
                  >
                    Total {drills.length} drill{drills.length !== 1 ? "s" : ""}{" "}
                    · Durée estimée ~{totalDrillMinutes} min · Coups{" "}
                    {totalDrillShots}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {drills.map((d, i) => (
                    <DrillCard
                      key={d.id}
                      drill={d}
                      index={i}
                      canRemove={drills.length > 1}
                      onUpdate={(patch) => updateDrill(d.id, patch)}
                      onRemove={() => removeDrill(d.id)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addDrill}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    background: "transparent",
                    border: "1px dashed rgba(235,229,210,0.15)",
                    color: "rgba(235,229,210,0.65)",
                    padding: "14px 16px",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  + Ajouter un drill
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#ebe5d2",
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                }}
              >
                Configure tes{" "}
                <span style={{ color: "#7A0000", fontStyle: "italic" }}>
                  munitions.
                </span>
              </h2>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(235,229,210,0.45)",
                }}
              >
                Arme · Calibre · Quantité
              </div>

              {dryFire ? (
                <div
                  style={{
                    ...sectionCardStyle,
                    marginTop: 32,
                    padding: "64px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#7A0000",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      lineHeight: 1,
                    }}
                  >
                    Dry fire — aucune munition requise.
                  </div>
                  <div
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "rgba(235,229,210,0.45)",
                    }}
                  >
                    Cette séance ne nécessite pas de munitions.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 32,
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                  }}
                >
                  {/* ARME PRINCIPALE */}
                  <div>
                    <div style={ammoSubHeaderStyle}>Arme principale</div>
                    <div style={sectionCardStyle}>
                      <Field label="Arme" full>
                        <TextInput
                          value={weapon}
                          onChange={setWeapon}
                          placeholder="CZ Shadow 2 · 9mm Para · Production"
                          list="opmind-weapon-suggestions"
                        />
                        <datalist id="opmind-weapon-suggestions">
                          {weaponSuggestions.map((w, i) => (
                            <option key={i} value={w} />
                          ))}
                        </datalist>
                      </Field>
                    </div>
                  </div>

                  {/* DÉTAIL MUNITIONS */}
                  <div>
                    <div style={ammoSubHeaderStyle}>Détail munitions</div>
                    <div
                      style={{
                        ...sectionCardStyle,
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 16,
                      }}
                    >
                      <Field label="Calibre">
                        <TextInput
                          value={caliber}
                          onChange={setCaliber}
                          placeholder="9mm Para"
                        />
                      </Field>
                      <Field label="Quantité">
                        <NumberInput
                          value={rounds}
                          onChange={setRoundsManual}
                        />
                      </Field>
                      <Field label="Grains (optionnel)">
                        <TextInput
                          value={grains}
                          onChange={setGrains}
                          placeholder="124 gr · FMJ"
                        />
                      </Field>
                      <Field label="PF (optionnel)">
                        <TextInput
                          value={pf}
                          onChange={setPf}
                          placeholder="132"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* ÉQUIPEMENT EMBARQUÉ */}
                  <div>
                    <div style={ammoSubHeaderStyle}>Équipement embarqué</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 8,
                      }}
                    >
                      {EQUIPMENT_ITEMS.map((item) => {
                        const checked = equipment.includes(item.key);
                        const dynLabel =
                          item.key === "chargeurs"
                            ? `${item.label} (${profileMagazines?.length ?? 0})`
                            : item.label;
                        return (
                          <EquipmentTile
                            key={item.key}
                            label={dynLabel}
                            checked={checked}
                            onToggle={() => toggleEquipment(item.key)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* CHARGEURS */}
                  <div>
                    <div style={ammoSubHeaderStyle}>Chargeurs</div>
                    <div style={sectionCardStyle}>
                      {magazinesLoading ? (
                        <p style={magazinesNoteStyle}>Chargement...</p>
                      ) : !profileMagazines ||
                        profileMagazines.length === 0 ? (
                        <p style={magazinesNoteStyle}>
                          Aucun chargeur configuré — configurez-les dans votre
                          profil.
                        </p>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 12,
                            }}
                          >
                            {profileMagazines.map((m, i) => (
                              <div
                                key={i}
                                style={{
                                  background: "#131318",
                                  border:
                                    "1px solid rgba(235,229,210,0.08)",
                                  padding: "16px 20px",
                                  display: "grid",
                                  gridTemplateColumns: "1fr auto 160px",
                                  alignItems: "center",
                                  gap: 20,
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily:
                                      "JetBrains Mono, monospace",
                                    fontSize: 11,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase",
                                    color: "rgba(235,229,210,0.65)",
                                  }}
                                >
                                  Chargeur {i + 1}
                                </span>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "baseline",
                                    gap: 6,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: FONT_DISPLAY,
                                      fontSize: 24,
                                      fontWeight: 700,
                                      color: "#ebe5d2",
                                      lineHeight: 1,
                                      letterSpacing: "-0.01em",
                                    }}
                                  >
                                    {m.rounds}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily:
                                        "JetBrains Mono, monospace",
                                      fontSize: 10,
                                      letterSpacing: "0.22em",
                                      textTransform: "uppercase",
                                      color: "rgba(235,229,210,0.45)",
                                    }}
                                  >
                                    Coups
                                  </span>
                                </div>
                                <Field label="Quantité">
                                  <NumberInput
                                    value={magQuantities[i] ?? ""}
                                    onChange={(v) =>
                                      setMagQuantities((prev) => ({
                                        ...prev,
                                        [i]: v,
                                      }))
                                    }
                                  />
                                </Field>
                              </div>
                            ))}
                          </div>

                          <div
                            style={{
                              marginTop: 16,
                              paddingTop: 16,
                              borderTop:
                                "1px solid rgba(235,229,210,0.06)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                            }}
                          >
                            <span style={magazinesNoteStyle}>
                              Capacité totale : {totalCapacity} coups
                            </span>
                            <span style={magazinesNoteStyle}>
                              Chargeurs nécessaires : {magazinesNeeded}
                            </span>
                            {insufficientCapacity && (
                              <span
                                style={{
                                  marginTop: 6,
                                  padding: "8px 10px",
                                  background: "#ffaa00",
                                  color: "#000",
                                  fontFamily:
                                    "JetBrains Mono, monospace",
                                  fontSize: 11,
                                  letterSpacing: "0.14em",
                                  textTransform: "uppercase",
                                  alignSelf: "flex-start",
                                }}
                              >
                                Attention — capacité insuffisante
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#ebe5d2",
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                }}
              >
                Définis le{" "}
                <span style={{ color: "#7A0000", fontStyle: "italic" }}>
                  contexte.
                </span>
              </h2>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(235,229,210,0.45)",
                }}
              >
                Conditions · Notes
              </div>

              <div
                style={{
                  marginTop: 32,
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                {/* MÉTÉO / CONDITIONS */}
                <div>
                  <div style={ammoSubHeaderStyle}>Météo / Conditions</div>
                  <div
                    style={{
                      ...sectionCardStyle,
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 16,
                    }}
                  >
                    <Field label="Météo">
                      <SelectInput
                        value={weather}
                        onChange={setWeather}
                        options={WEATHER_OPTIONS}
                      />
                    </Field>
                    <Field label="Luminosité">
                      <SelectInput
                        value={lighting}
                        onChange={setLighting}
                        options={LIGHTING_OPTIONS}
                      />
                    </Field>
                    <Field label="État physique">
                      <SelectInput
                        value={physicalState}
                        onChange={setPhysicalState}
                        options={PHYSICAL_STATE_OPTIONS}
                      />
                    </Field>
                  </div>
                </div>

                {/* NOTES & RAPPELS */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: "rgba(235,229,210,0.35)",
                      }}
                    >
                      Notes &amp; rappels
                    </span>
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "rgba(235,229,210,0.55)",
                        border: "1px solid rgba(235,229,210,0.2)",
                        padding: "2px 8px",
                      }}
                    >
                      Optionnel
                    </span>
                  </div>
                  <div style={sectionCardStyle}>
                    <TextArea
                      value={contextNotes}
                      onChange={setContextNotes}
                      rows={4}
                      placeholder="Ex. Vérifier la prise initiale main faible. Penser à enregistrer les splits de la stage complète."
                    />
                  </div>
                </div>

                {/* TAGS */}
                <div>
                  <div style={ammoSubHeaderStyle}>Tags</div>
                  <div style={sectionCardStyle}>
                    <Field label="Tags" full>
                      <TextInput
                        value={tags}
                        onChange={setTags}
                        placeholder="Ex. ipsc, transition, vitesse"
                      />
                      <div
                        style={{
                          marginTop: 8,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "rgba(235,229,210,0.35)",
                        }}
                      >
                        Séparés par virgule
                      </div>
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 12,
            alignItems: "stretch",
          }}
        >
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              style={{
                background: "transparent",
                border: "1px solid rgba(235,229,210,0.2)",
                color: "rgba(235,229,210,0.65)",
                padding: "16px 24px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              ← Précédent
            </button>
          )}
          {step < STEPS.length && (
            <button
              type="button"
              onClick={nextStep}
              disabled={nextDisabled}
              style={{
                flex: 1,
                background: nextDisabled ? "#1a1a22" : "#7A0000",
                border: "none",
                color: nextDisabled ? "rgba(235,229,210,0.3)" : "#fff",
                padding: "16px 24px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                cursor: nextDisabled ? "not-allowed" : "pointer",
                transition: "background .15s",
              }}
            >
              Suivant →
            </button>
          )}
          {step === STEPS.length && (
            <>
              <button
                type="button"
                onClick={onSaveTemplate}
                disabled={templateSaving || !name.trim()}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(235,229,210,0.2)",
                  color: "rgba(235,229,210,0.65)",
                  padding: "16px 24px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor:
                    templateSaving || !name.trim()
                      ? "not-allowed"
                      : "pointer",
                  opacity: templateSaving || !name.trim() ? 0.6 : 1,
                }}
              >
                {templateSaving
                  ? "Template..."
                  : "Enregistrer comme template"}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                style={{
                  flex: 1,
                  background: "#7A0000",
                  border: "none",
                  color: "#fff",
                  padding: "16px 24px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  transition: "background .15s",
                }}
              >
                {saving
                  ? editingId
                    ? "Mise à jour..."
                    : "Sauvegarde..."
                  : editingId
                    ? "Mettre à jour la séance"
                    : "Enregistrer la séance"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recap side panel */}
      <aside
        style={{
          width: 320,
          flexShrink: 0,
          background: "#0d0d12",
          borderLeft: "1px solid rgba(235,229,210,0.06)",
          padding: 24,
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.35)",
            }}
          >
            // Fiche en cours
          </span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              padding: "3px 8px",
              background: "rgba(122,0,0,0.15)",
              border: "1px solid #7A0000",
              color: "#7A0000",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 700,
              animation: "opmind-blink 1.4s ease-in-out infinite",
            }}
          >
            Brouillon
          </span>
        </div>

        {/* Name */}
        <div
          style={{
            marginTop: 16,
            fontFamily: FONT_DISPLAY,
            fontSize: 20,
            fontWeight: 700,
            color: name.trim() ? "#ebe5d2" : "rgba(235,229,210,0.3)",
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            lineHeight: 1.2,
            wordBreak: "break-word",
          }}
        >
          {name.trim() || "Séance sans nom..."}
        </div>

        {/* Metrics 2x2 */}
        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            background: "rgba(235,229,210,0.06)",
          }}
        >
          <MetricCell label="Mode" value={dryFire ? "Dry fire" : "Tir réel"} />
          <MetricCell
            label="Distance"
            value={Number(distance) > 0 ? `${Number(distance)} m` : "—"}
          />
          <MetricCell
            label="Coups"
            value={dryFire ? "—" : String(totalDrillShots || roundsNum)}
          />
          <MetricCell
            label="Durée est."
            value={totalDrillMinutes > 0 ? `~${totalDrillMinutes} min` : "—"}
          />
        </div>

        {/* Progress */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <CircularProgress pct={completionPct} />
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(235,229,210,0.55)",
              textAlign: "center",
            }}
          >
            {filledCount} / {criticalFields.length} champs critiques
          </div>
          {missingFields.length > 0 && (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignSelf: "stretch",
              }}
            >
              {missingFields.map((f) => (
                <li
                  key={f}
                  style={{
                    color: "#e84a3a",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  · Manque : {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Buttons */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              background: "transparent",
              border: "1px solid rgba(235,229,210,0.2)",
              color: "rgba(235,229,210,0.65)",
              padding: "12px 16px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Sauvegarde..." : "Enregistrer brouillon"}
          </button>
          <button
            type="button"
            onClick={onExportJson}
            disabled={!canSubmit}
            style={{
              background: canSubmit ? "#7A0000" : "#1a1a22",
              border: "none",
              color: canSubmit ? "#fff" : "rgba(235,229,210,0.3)",
              padding: "14px 16px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            Envoyer vers l&apos;app
          </button>
          <button
            type="button"
            onClick={resetAll}
            style={{
              marginTop: 8,
              background: "transparent",
              border: "none",
              color: "rgba(235,229,210,0.45)",
              padding: 0,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              width: "100%",
              textAlign: "center",
            }}
          >
            Réinitialiser
          </button>
        </div>

        {feedback && (
          <p
            role="alert"
            style={{
              marginTop: 16,
              margin: "16px 0 0 0",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: feedback.kind === "ok" ? "#5ad99b" : "#e84a3a",
            }}
          >
            {feedback.msg}
          </p>
        )}

        {savedOk && (
          <button
            type="button"
            onClick={() => setView("sessions")}
            style={{
              marginTop: 12,
              width: "100%",
              background: "transparent",
              border: "1px solid #5ad99b",
              color: "#5ad99b",
              padding: "10px 14px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Voir mes sessions →
          </button>
        )}
      </aside>
    </div>
  );
}

const magazinesNoteStyle: CSSProperties = {
  margin: 0,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(235,229,210,0.65)",
};

const ammoSubHeaderStyle: CSSProperties = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(235,229,210,0.35)",
  marginBottom: 12,
};

function EquipmentTile({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      style={{
        background: checked ? "#1a0a0a" : "#131318",
        border: checked
          ? "1px solid #7A0000"
          : "1px solid rgba(235,229,210,0.08)",
        color: checked ? "#ebe5d2" : "rgba(235,229,210,0.65)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        textAlign: "left",
        transition: "background .15s, border-color .15s, color .15s",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: checked
            ? "1px solid #7A0000"
            : "1px solid rgba(235,229,210,0.3)",
          background: checked ? "#7A0000" : "transparent",
        }}
        aria-hidden
      >
        {checked && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
    </button>
  );
}

const magazinesRowLabelStyle: CSSProperties = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#ebe5d2",
};

const FONT_DISPLAY =
  '"Antonio", var(--font-barlow-condensed), system-ui, sans-serif';

const sectionCardStyle: CSSProperties = {
  background: "#0d0d12",
  border: "1px solid rgba(235,229,210,0.06)",
  padding: 24,
};

function SectionHeader({ index, label }: { index: string; label: string }) {
  return (
    <div style={{ marginTop: 32, marginBottom: 16 }}>
      <h2
        style={{
          margin: 0,
          marginBottom: 10,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.35)",
        }}
      >
        {index} — {label}
      </h2>
      <div
        style={{ height: 1, background: "rgba(235,229,210,0.06)" }}
        aria-hidden
      />
    </div>
  );
}

function ToggleButton({
  active,
  activeBg,
  onClick,
  label,
}: {
  active: boolean;
  activeBg: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        height: 48,
        background: active ? activeBg : "transparent",
        border: active
          ? `1px solid ${activeBg}`
          : "1px solid rgba(235,229,210,0.2)",
        color: active ? "#fff" : "rgba(235,229,210,0.65)",
        padding: "0 16px",
        fontFamily: FONT_DISPLAY,
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "background .15s, border-color .15s, color .15s",
      }}
    >
      {label}
    </button>
  );
}

function slugifySessionName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30);
  return slug || "seance";
}

function ModeCard({
  active,
  onClick,
  bg,
  title,
  subtitle,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  bg: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 80,
        background: active ? bg : "transparent",
        border: active
          ? `1px solid ${bg}`
          : "1px solid rgba(235,229,210,0.1)",
        color: active ? "#fff" : "rgba(235,229,210,0.65)",
        padding: "0 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        textAlign: "left",
        cursor: "pointer",
        transition: "background .15s, border-color .15s, color .15s",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          color: active ? "#fff" : "rgba(235,229,210,0.65)",
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: active ? "#fff" : "#ebe5d2",
            lineHeight: 1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: active
              ? "rgba(255,255,255,0.7)"
              : "rgba(235,229,210,0.45)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#0d0d12",
        padding: 12,
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: FONT_DISPLAY,
          fontSize: 16,
          fontWeight: 700,
          color: "#ebe5d2",
          letterSpacing: "-0.01em",
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CircularProgress({ pct }: { pct: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * c;
  const color = clamped === 100 ? "#5ad99b" : "#7A0000";
  return (
    <svg
      width={88}
      height={88}
      viewBox="0 0 88 88"
      role="img"
      aria-label={`${clamped}% complété`}
    >
      <circle
        cx={44}
        cy={44}
        r={r}
        fill="none"
        stroke="rgba(235,229,210,0.08)"
        strokeWidth={4}
      />
      <circle
        cx={44}
        cy={44}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 44 44)"
        strokeLinecap="round"
      />
      <text
        x={44}
        y={50}
        fontFamily="JetBrains Mono, monospace"
        fontSize={16}
        fontWeight={700}
        fill="#ebe5d2"
        textAnchor="middle"
      >
        {clamped}%
      </text>
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="1" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5ad99b"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DrillCard({
  drill,
  index,
  canRemove,
  onUpdate,
  onRemove,
}: {
  drill: DrillDraft;
  index: number;
  canRemove: boolean;
  onUpdate: (patch: Partial<DrillDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        background: "#131318",
        border: "1px solid rgba(235,229,210,0.08)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto 1fr auto",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          aria-hidden
          title="Réordonner (à venir)"
          style={{
            color: "rgba(235,229,210,0.3)",
            fontSize: 18,
            lineHeight: 1,
            cursor: "grab",
            userSelect: "none",
            padding: "0 4px",
          }}
        >
          ⠿
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 14,
            fontWeight: 700,
            color: "#7A0000",
            letterSpacing: "0.06em",
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <input
          type="text"
          value={drill.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Ex. Présentation depuis holster"
          style={{
            width: "100%",
            background: "#0a0a0c",
            border: "none",
            borderBottom: "1px solid rgba(235,229,210,0.2)",
            color: "#ebe5d2",
            padding: "10px 4px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            letterSpacing: "0.04em",
            outline: "none",
          }}
        />
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Supprimer le drill ${index + 1}`}
            style={{
              background: "transparent",
              border: "1px solid rgba(232,74,58,0.4)",
              color: "#e84a3a",
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 13,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        ) : (
          <div style={{ width: 28 }} />
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 100px",
          gap: 16,
        }}
      >
        <Field label="Position">
          <TextInput
            value={drill.position}
            onChange={(v) => onUpdate({ position: v })}
            placeholder="Départ T1"
          />
        </Field>
        <Field label="Zone">
          <SelectInput
            value={drill.zone}
            onChange={(v) =>
              onUpdate({ zone: v as "a" | "c" | "all" })
            }
            options={ZONE_OPTIONS}
          />
        </Field>
        <Field label="Coups">
          <NumberInput
            value={String(drill.shots)}
            onChange={(v) => onUpdate({ shots: Number(v) || 0 })}
          />
        </Field>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 140px",
          gap: 16,
        }}
      >
        <Field label="Par time">
          <TextInput
            value={drill.parTime}
            onChange={(v) => onUpdate({ parTime: v })}
            placeholder="1.20s"
          />
        </Field>
        <Field label="Répétitions">
          <NumberInput
            value={String(drill.reps)}
            onChange={(v) =>
              onUpdate({ reps: Math.max(1, Number(v) || 1) })
            }
          />
        </Field>
      </div>
    </div>
  );
}

function CheckBadge() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      style={{ position: "absolute", top: 12, right: 12 }}
      aria-hidden
    >
      <circle cx="12" cy="12" r="11" fill="#7A0000" />
      <polyline
        points="17 9 10.5 16 7 13"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TargetIllustration({ value }: { value: TargetType }) {
  if (value === "rings") return <IllRings />;
  if (value === "silhouette") return <IllIpsc />;
  if (value === "plates") return <IllSteelPopper />;
  if (value === "silhouette_police") return <IllSilhouettePolice />;
  return null;
}

function IllRings() {
  const radii = [60, 54, 48, 42, 36, 30, 24, 18, 12];
  return (
    <svg width="64" height="64" viewBox="0 0 140 140" aria-hidden>
      <rect width="140" height="140" fill="#1a1a22" />
      {radii.map((r) => (
        <circle
          key={r}
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="rgba(235,229,210,0.15)"
          strokeWidth="1"
        />
      ))}
      <circle cx="70" cy="70" r="6" fill="#7A0000" />
    </svg>
  );
}

function IllIpsc() {
  return (
    <svg width="64" height="64" viewBox="0 0 140 140" aria-hidden>
      <rect width="140" height="140" fill="#1a1a22" />
      <rect
        x="40"
        y="20"
        width="60"
        height="100"
        fill="none"
        stroke="rgba(235,229,210,0.35)"
        strokeWidth="2"
      />
      <rect
        x="56"
        y="36"
        width="28"
        height="34"
        fill="none"
        stroke="rgba(235,229,210,0.55)"
        strokeWidth="2"
      />
      <line
        x1="40"
        y1="84"
        x2="100"
        y2="84"
        stroke="rgba(235,229,210,0.25)"
        strokeWidth="1"
      />
    </svg>
  );
}

function IllSteelPopper() {
  return (
    <svg width="64" height="64" viewBox="0 0 140 140" aria-hidden>
      <rect width="140" height="140" fill="#1a1a22" />
      {/* Popper: trapezoid head + stem */}
      <polygon
        points="40,28 70,28 78,60 32,60"
        fill="rgba(235,229,210,0.45)"
      />
      <rect
        x="50"
        y="60"
        width="18"
        height="44"
        fill="rgba(235,229,210,0.45)"
      />
      <rect
        x="40"
        y="104"
        width="38"
        height="6"
        fill="rgba(235,229,210,0.45)"
      />
      {/* Plate */}
      <circle cx="106" cy="78" r="14" fill="rgba(235,229,210,0.35)" />
    </svg>
  );
}

function IllSilhouettePolice() {
  return (
    <svg width="64" height="64" viewBox="0 0 140 140" aria-hidden>
      <rect width="140" height="140" fill="#1a1a22" />
      {/* Head */}
      <circle cx="70" cy="34" r="14" fill="rgba(235,229,210,0.5)" />
      {/* Shoulders + torso */}
      <path
        d="M40 60 Q70 50 100 60 L106 120 L34 120 Z"
        fill="rgba(235,229,210,0.5)"
      />
    </svg>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        background: "#0a0a0c",
        border: "none",
        borderBottom: "1px solid rgba(235,229,210,0.2)",
        color: "#ebe5d2",
        padding: "8px 4px",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        letterSpacing: "0.04em",
        outline: "none",
      }}
    />
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        background: "#0a0a0c",
        border: "none",
        borderBottom: "1px solid rgba(235,229,210,0.2)",
        color: "#ebe5d2",
        padding: "8px 4px",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        letterSpacing: "0.04em",
        outline: "none",
        colorScheme: "dark",
      }}
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: "#0a0a0c",
        border: "1px solid rgba(235,229,210,0.12)",
        color: "#ebe5d2",
        padding: "10px 12px",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        lineHeight: 1.5,
        letterSpacing: "0.04em",
        outline: "none",
        resize: "vertical",
      }}
    />
  );
}

/* ──────────────  Shared blocks  ────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.55)",
          marginBottom: 16,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div
      style={{
        background: "#131318",
        border: "1px solid rgba(235,229,210,0.08)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
          padding: "10px 16px",
          borderBottom: "1px solid rgba(235,229,210,0.08)",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(235,229,210,0.45)",
        }}
      >
        {headers.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
            padding: "12px 16px",
            borderBottom:
              i === rows.length - 1
                ? "none"
                : "1px solid rgba(235,229,210,0.04)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "#ebe5d2",
          }}
        >
          {row.map((c, j) => (
            <span
              key={j}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#131318",
        border: "1px solid rgba(235,229,210,0.08)",
        padding: "20px 16px",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
        letterSpacing: "0.12em",
        color: "rgba(235,229,210,0.45)",
      }}
    >
      {children}
    </div>
  );
}

function FullStatus({ text }: { text: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0c",
        color: "rgba(235,229,210,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 12,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      {text}
    </main>
  );
}

/* ──────────────  Helpers  ────────────── */

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
}

function computeStreak(sessions: Session[]): number {
  if (!sessions.length) return 0;
  // Clés de jour en temps LOCAL (et non UTC) : sinon minuit local converti en
  // UTC peut tomber la veille (France = UTC+1/+2) et casser le streak du jour.
  const dayKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const dates = new Set<string>();
  for (const s of sessions) {
    const v = s.date || s.created_at;
    if (!v) continue;
    const d = new Date(v);
    if (isNaN(d.getTime())) continue;
    dates.add(dayKey(d));
  }
  if (dates.size === 0) return 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayKey = dayKey(cursor);
  if (!dates.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  for (let i = 0; i < 1000; i++) {
    const key = dayKey(cursor);
    if (dates.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/* ──────────────  Inline SVG icons  ────────────── */

function OpMindLogo() {
  return (
    <svg
      viewBox="0 0 130 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OpMind"
      style={{ height: 24, width: "auto" }}
    >
      <text
        x="0"
        y="25"
        fontFamily="'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif"
        fontSize="28"
        fontWeight="800"
        letterSpacing="-0.5"
        fill="#ebe5d2"
      >
        OpMind<tspan fill="#7A0000">.</tspan>
      </text>
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconTimer() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v5l3 2" />
      <path d="M9 2h6" />
      <path d="M12 2v3" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M7 14l4-5 3 3 4-6" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c0-3.5 3.1-6 7-6s7 2.5 7 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 21c0-2.5 2-4 5-4" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="9" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function IconCog() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z" />
    </svg>
  );
}
