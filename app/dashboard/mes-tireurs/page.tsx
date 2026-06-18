"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";
import { fetchUnifiedSessions } from "../../../components/dashboard/data";
import { moduleLabel } from "../../../components/dashboard/modules";
import { fmtDot } from "../../../components/dashboard/format";
import { EmptyState } from "../../../components/dashboard/ui";
import styles from "../../../components/dashboard/dashboard.module.css";
import type {
  Shooter,
  UnifiedSession,
} from "../../../components/dashboard/types";

/* ──────────────  Tokens  ────────────── */

// Couleurs de niveau (LEVEL_PALETTE) — seules valeurs « langage B » conservées
// après bascule sur le design system partagé (le reste vit dans dashboard.module.css).
const ACCENT_BRIGHT = "#E84040";
const WARN = "#FF6B00";
const INFO = "#4D8AFF";

// Grille partagée en-tête + lignes de la vue liste (.st-head / .st-row).
const LIST_COLS = "minmax(0, 1.6fr) 100px 0.8fr 0.8fr 96px";

const LEVEL_PALETTE: Record<string, string> = {
  A: ACCENT_BRIGHT,
  B: WARN,
  C: INFO,
  D: "#888",
};

const LEVEL_LABELS: Record<string, string> = {
  A: "A · 80+",
  B: "B · 70+",
  C: "C · 60+",
  D: "D · <60",
};

/* ──────────────  Types  ────────────── */

// Types locaux InstructorShooterRow / ManualSessionRow supprimés :
// source unique = Shooter / UnifiedSession (components/dashboard/types).

type ProfileLite = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
};

type DerivedShooter = {
  row: Shooter;
  sessions: UnifiedSession[];
  level: "A" | "B" | "C" | "D";
  lastScore: number;
  scoreDelta: number;
  accuracy: number;
  accDelta: number;
  lastModule: string | null;
  lastHitFactor: number | null;
  sessionsCount: number;
  sessionsDelta: number;
  club: string;
  flag?: "stagne" | "rapide" | "contact";
  lastActivity: Date | null;
};

/* ──────────────  Helpers  ────────────── */

function deriveLevelFromScore(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function deriveShooter(
  row: Shooter,
  sessions: UnifiedSession[]
): DerivedShooter {
  const ordered = [...sessions].sort(
    (a, b) =>
      new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
  );

  // Headline = DERNIÈRE séance (un seul module). Score = normalized_score réel,
  // HF = hit_factor réel (jamais normalized/10). Jamais de moyenne inter-modules.
  const last = ordered[ordered.length - 1] ?? null;
  const lastModule = last?.module ?? null;
  const lastScore =
    last && typeof last.normalized_score === "number" ? last.normalized_score : 0;
  const lastAcc =
    last && typeof last.accuracy === "number" ? last.accuracy * 100 : 0;
  const lastHitFactor =
    last && typeof last.hit_factor === "number" ? last.hit_factor : null;

  // Deltas = dernière vs précédente séance DU MÊME MODULE (segmenté, pas d'agrégat).
  const sameModule = ordered.filter((s) => (s.module ?? null) === lastModule);
  const prev = sameModule.length >= 2 ? sameModule[sameModule.length - 2] : null;
  const prevScore =
    prev && typeof prev.normalized_score === "number" ? prev.normalized_score : 0;
  const prevAcc =
    prev && typeof prev.accuracy === "number" ? prev.accuracy * 100 : 0;
  const scoreDelta = prevScore > 0 ? Math.round(lastScore - prevScore) : 0;
  const accDelta = prevAcc > 0 ? Math.round(lastAcc - prevAcc) : 0;
  // Volume récent = comptage 30j (un nombre, pas une moyenne).
  const cutoff = Date.now() - 30 * 86400000;
  const sessionsDelta = sessions.filter(
    (s) => new Date(s.date || 0).getTime() >= cutoff
  ).length;

  const lastActivity = sessions
    .map((s) => new Date(s.date || 0))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  // Flag based on simple heuristics
  let flag: DerivedShooter["flag"] | undefined;
  const daysSinceLast = lastActivity
    ? Math.floor((Date.now() - lastActivity.getTime()) / 86400000)
    : 999;
  if (daysSinceLast > 14) flag = "contact";
  else if (scoreDelta < -3) flag = "stagne";
  else if (scoreDelta > 5) flag = "rapide";

  return {
    row,
    sessions,
    level: deriveLevelFromScore(lastScore),
    lastScore,
    scoreDelta,
    accuracy: Math.round(lastAcc),
    accDelta,
    lastModule,
    lastHitFactor,
    sessionsCount: sessions.length,
    sessionsDelta,
    club: row.unit || "",
    flag,
    lastActivity,
  };
}

function relTime(d: Date | null): string {
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} j`;
  const months = Math.floor(days / 30);
  return `${months} mois`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

/* ──────────────  Page  ────────────── */

type FilterKey = "all" | "A" | "B" | "C" | "D";

export default function MesTireursPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [shooters, setShooters] = useState<DerivedShooter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortBy] = useState<"activity">("activity");

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
            .select("first_name,last_name,email,role")
            .eq("id", userId)
            .maybeSingle();
          if (!cancelled && prof) setProfile(prof as ProfileLite);
        } catch {
          /* ignore */
        }

        const { data: rows } = await sb
          .from("instructor_shooters")
          .select(
            "id,instructor_id,shooter_id,name,unit,grade,specialite,instructor_notes,status,linked_at,invite_code,invite_status"
          )
          .eq("instructor_id", userId)
          .order("linked_at", { ascending: false });

        const list = (rows as Shooter[] | null) || [];
        // Source unifiée : manual_sessions + module_sessions (activité réelle app).
        const unified = await fetchUnifiedSessions(list);
        const sessionsByShooter = unified.reduce<
          Record<string, UnifiedSession[]>
        >((acc, s) => {
          (acc[s.instructor_shooter_id] ||= []).push(s);
          return acc;
        }, {});

        const derived = list.map((row) =>
          deriveShooter(row, sessionsByShooter[row.id] || [])
        );
        if (!cancelled) setShooters(derived);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: shooters.length,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    };
    for (const s of shooters) c[s.level]++;
    return c;
  }, [shooters]);

  const activeShooters = useMemo(
    () => shooters.filter((s) => s.row.status === "active"),
    [shooters]
  );
  const pendingShooters = useMemo(
    () => shooters.filter((s) => s.row.status === "pending"),
    [shooters]
  );

  const filtered = useMemo(() => {
    let list = shooters;
    if (filter !== "all") list = list.filter((s) => s.level === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.row.name.toLowerCase().includes(q) ||
          (s.club || "").toLowerCase().includes(q) ||
          (s.row.specialite || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "activity") {
      list = [...list].sort((a, b) => {
        const ta = a.lastActivity?.getTime() || 0;
        const tb = b.lastActivity?.getTime() || 0;
        return tb - ta;
      });
    }
    return list;
  }, [shooters, filter, search, sortBy]);

  /* ────  Aggregate KPIs  ──── */
  const totalSessions30d = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return shooters.reduce(
      (sum, s) =>
        sum +
        s.sessions.filter((x) => {
          const t = new Date(x.date || 0).getTime();
          return !isNaN(t) && t >= cutoff;
        }).length,
      0
    );
  }, [shooters]);
  // Vraie moyenne sur l'échelle 0–100 (dernière séance de chaque tireur).
  // L'arrondi d'affichage est géré par toFixed(1).
  const classScore =
    activeShooters.length > 0
      ? activeShooters.reduce((sum, s) => sum + s.lastScore, 0) /
        activeShooters.length
      : 0;
  const classAcc =
    activeShooters.length > 0
      ? Math.round(
          activeShooters.reduce((sum, s) => sum + s.accuracy, 0) /
            activeShooters.length
        )
      : 0;
  const sessionsPerWeek = Math.round(totalSessions30d / 4);

  /* ────  Leaderboard  ──── */
  const leaderboard = useMemo(
    () => [...shooters].sort((a, b) => b.lastScore - a.lastScore).slice(0, 5),
    [shooters]
  );

  /* ────  Activity feed  ──── */
  const liveFeed = useMemo(() => {
    const events: {
      shooter: DerivedShooter;
      label: string;
      value: string;
      color: string;
      at: Date;
    }[] = [];
    for (const s of shooters) {
      if (!s.lastActivity) continue;
      const daysSince = Math.floor(
        (Date.now() - s.lastActivity.getTime()) / 86400000
      );
      let color = "var(--green)";
      let label = "Session terminée";
      if (daysSince > 14) {
        color = "var(--red)";
        label = "Inactif depuis";
      } else if (s.flag === "stagne") {
        color = "var(--amber)";
        label = "Stagnation détectée";
      } else if (s.flag === "rapide") {
        color = "var(--green)";
        label = "Progression rapide";
      }
      events.push({
        shooter: s,
        label,
        value:
          s.flag === "stagne"
            ? `Score ${Math.round(s.lastScore)}`
            : `${daysSince} j`,
        color,
        at: s.lastActivity,
      });
    }
    return events
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 8);
  }, [shooters]);

  /* ────  Groups (pseudo-classes derived from level)  ──── */
  const groups = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of shooters) {
      const k = LEVEL_LABELS[s.level];
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries());
  }, [shooters]);

  async function onDeleteInvitation(id: string, name: string) {
    if (!window.confirm(`Supprimer l'invitation pour ${name} ?`)) return;
    try {
      const sb = getSupabase();
      const { error } = await sb
        .from("instructor_shooters")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("Suppression invitation échouée:", error);
        return;
      }
      setShooters((prev) => prev.filter((s) => s.row.id !== id));
    } catch (e) {
      console.error("Suppression invitation échouée:", e);
    }
  }

  return (
    <div
      className={styles.page}
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        color: "var(--ink)",
        fontFamily: "var(--sans)",
      }}
    >
      {/* Top header */}
      <TopHeader search={search} onSearch={setSearch} />

      <main style={{ padding: "32px 40px 80px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32 }}>
        <div style={{ minWidth: 0 }}>
          {/* Title section */}
          <TitleSection
            activeCount={activeShooters.length}
            pendingCount={pendingShooters.length}
          />

          {/* Stats strip */}
          <StatsStrip
            activeCount={activeShooters.length}
            classScore={classScore}
            classAcc={classAcc}
            sessionsPerWeek={sessionsPerWeek}
          />

          {/* Filters */}
          <Filters
            filter={filter}
            setFilter={setFilter}
            counts={counts}
            view={view}
            setView={setView}
          />

          {/* Grid */}
          {loading ? (
            <EmptyState>Chargement...</EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState>Aucun tireur correspondant.</EmptyState>
          ) : view === "grid" ? (
            <div
              style={{
                marginTop: 20,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              {filtered.map((s) => (
                <ShooterCard
                  key={s.row.id}
                  s={s}
                  onOpen={() => router.push(`/dashboard/shooter?id=${s.row.id}`)}
                />
              ))}
              <InvitePlaceholder />
            </div>
          ) : (
            <div className={styles.panel} style={{ marginTop: 20 }}>
              <div
                className={styles["st-head"]}
                style={{ gridTemplateColumns: LIST_COLS }}
              >
                <span>Tireur</span>
                <span>Niveau</span>
                <span>Score</span>
                <span>Précision</span>
                <span>Dernière</span>
              </div>
              {filtered.map((s) => (
                <ShooterListRow
                  key={s.row.id}
                  s={s}
                  onOpen={() => router.push(`/dashboard/shooter?id=${s.row.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panels */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignSelf: "start",
          }}
        >
          <LeaderboardPanel
            entries={leaderboard}
            selfName={
              `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
            }
          />
          <InvitationsPanel
            shooters={pendingShooters}
            onDelete={onDeleteInvitation}
          />
          <GroupsPanel groups={groups} />
          <ActivityFeedPanel events={liveFeed} />
        </aside>
      </main>
    </div>
  );
}

/* ──────────────  Top header  ────────────── */

function TopHeader({
  search,
  onSearch,
}: {
  search: string;
  onSearch: (v: string) => void;
}) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        height: 56,
        background: "var(--bg)",
        borderBottom: "1px solid var(--line)",
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        alignItems: "center",
        gap: 16,
        padding: "0 24px",
        zIndex: 30,
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--dim)",
        }}
      >
        <span style={{ color: "var(--dim-2)" }}>Dashboard</span>
        <span style={{ margin: "0 8px", color: "var(--dim-2)" }}>/</span>
        <span style={{ color: "var(--ink)" }}>Mes Tireurs</span>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Rechercher tireur, niveau, club..."
        style={{
          background: "var(--bg)",
          border: "1px solid var(--line)",
          color: "var(--ink)",
          padding: "8px 12px",
          fontFamily: "var(--mono)",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          outline: "none",
        }}
      />
    </header>
  );
}

/* ──────────────  Title section  ────────────── */

function TitleSection({
  activeCount,
  pendingCount,
}: {
  activeCount: number;
  pendingCount: number;
}) {
  return (
    <div className={styles["page-head"]}>
      <div>
        <div className={styles.eyebrow}>Module · Coaching Roster</div>
        <h1 className={styles.title}>
          Mes <em>Tireurs.</em>
        </h1>
        <div className={styles["title-sub"]}>
          Suivi de la progression et des séances de ta classe.
        </div>
      </div>
      <div className={styles["head-meta"]}>
        <div className={styles.stat}>
          <span>Actifs</span>
          <strong>{String(activeCount).padStart(2, "0")}</strong>
        </div>
        <div className={styles.stat}>
          <span>Invitations</span>
          <strong>{String(pendingCount).padStart(2, "0")}</strong>
        </div>
      </div>
    </div>
  );
}

/* ──────────────  Stats strip  ────────────── */

function StatsStrip({
  activeCount,
  classScore,
  classAcc,
  sessionsPerWeek,
}: {
  activeCount: number;
  classScore: number;
  classAcc: number;
  sessionsPerWeek: number;
}) {
  const blocks: { label: string; value: string; sub: string }[] = [
    {
      label: "Tireurs actifs",
      value: String(activeCount),
      sub: "Σ roster lié · statut actif",
    },
    {
      label: "Score moyen classe",
      value: classScore > 0 ? classScore.toFixed(1) : "—",
      sub: "Dernière séance · modules confondus",
    },
    {
      label: "Accuracy moy.",
      value: classAcc > 0 ? `${classAcc}%` : "—",
      sub: "Dernière séance · tireurs actifs",
    },
    {
      label: "Sessions / sem.",
      value: String(sessionsPerWeek),
      sub: "Moyenne sur 30 jours",
    },
  ];
  return (
    <div className={styles["kpi-grid"]}>
      {blocks.map((b) => (
        <div key={b.label} className={styles.kpi}>
          <div className={styles["kpi-head"]}>
            <span className={styles["kpi-l"]}>{b.label}</span>
          </div>
          <span
            className={`${styles["kpi-v"]} ${
              b.value === "—" ? styles.empty : ""
            }`}
          >
            {b.value}
          </span>
          <span className={styles["kpi-sub"]}>{b.sub}</span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────  Filters  ────────────── */

function Filters({
  filter,
  setFilter,
  counts,
  view,
  setView,
}: {
  filter: FilterKey;
  setFilter: (v: FilterKey) => void;
  counts: Record<FilterKey, number>;
  view: "grid" | "list";
  setView: (v: "grid" | "list") => void;
}) {
  const tabs: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "A", label: "A" },
    { key: "B", label: "B" },
    { key: "C", label: "C" },
    { key: "D", label: "D" },
  ];
  return (
    <div
      style={{
        marginTop: 32,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        paddingBottom: 12,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {tabs.map((t) => {
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={styles["btn-mini"]}
              style={
                active
                  ? { borderColor: "var(--red)", color: "var(--red)" }
                  : undefined
              }
            >
              {t.label}{" "}
              <span
                style={{
                  color: active ? "var(--dim)" : "var(--dim-2)",
                  marginLeft: 4,
                }}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>
      <span
        style={{
          marginLeft: "auto",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--dim)",
        }}
      >
        Tri · Activité récente
      </span>
      <div style={{ display: "flex" }}>
        <button
          type="button"
          onClick={() => setView("grid")}
          aria-label="Vue grille"
          style={{
            background: "transparent",
            border: `1px solid ${
              view === "grid" ? "var(--red)" : "var(--line-2)"
            }`,
            color: view === "grid" ? "var(--red)" : "var(--dim)",
            width: 32,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconGrid />
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          aria-label="Vue liste"
          style={{
            background: "transparent",
            border: `1px solid ${
              view === "list" ? "var(--red)" : "var(--line-2)"
            }`,
            borderLeft: "none",
            color: view === "list" ? "var(--red)" : "var(--dim)",
            width: 32,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconList />
        </button>
      </div>
    </div>
  );
}

/* ──────────────  Shooter card  ────────────── */

function ShooterCard({ s, onOpen }: { s: DerivedShooter; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ouvrir la fiche de ${s.row.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        background: "var(--surface)",
        border: `1px solid ${hover ? "var(--red)" : "var(--line)"}`,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        cursor: "pointer",
        outline: "none",
        transition: "border-color 120ms ease",
      }}
    >
      <CardHeader s={s} />
      <CardStats s={s} />
      <CardFooter s={s} />
      <CardFlag flag={s.flag} />
      <CardInvite s={s} />
    </div>
  );
}

/* ──────────────  Card invite (code + badge statut)  ────────────── */

function CardInvite({ s }: { s: DerivedShooter }) {
  const [copied, setCopied] = useState(false);
  const inviteStatus = s.row.invite_status;
  const code = s.row.invite_code;

  // Pas de bloc si aucun statut d'invitation connu.
  if (inviteStatus !== "pending" && inviteStatus !== "accepted") return null;

  if (inviteStatus === "accepted") {
    return (
      <div
        style={{
          paddingTop: 12,
          borderTop: "1px solid var(--line)",
          display: "flex",
        }}
      >
        <span
          className={styles.badge}
          style={{ color: "var(--green)", borderColor: "var(--green)" }}
        >
          Lié
        </span>
      </div>
    );
  }

  // pending
  async function onCopy(e: MouseEvent) {
    // Évite d'ouvrir la fiche tireur (la carte entière est cliquable).
    e.stopPropagation();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponible — silencieux */
    }
  }

  async function onShare(e: MouseEvent) {
    // Évite d'ouvrir la fiche tireur (la carte entière est cliquable).
    e.stopPropagation();
    if (!code) return;
    const message = `Vous avez été ajouté au groupe OpMind.\nOuvrez l'app → Rejoindre un instructeur → Code : ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Invitation OpMind", text: message });
      } catch {
        /* partage annulé par l'utilisateur — silencieux */
      }
    } else {
      // Fallback desktop : WhatsApp Web pré-rempli.
      const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank");
    }
  }

  return (
    <div
      style={{
        paddingTop: 12,
        borderTop: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        className={styles.badge}
        style={{
          color: "var(--amber)",
          borderColor: "var(--amber)",
          alignSelf: "flex-start",
        }}
      >
        En attente
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: "var(--surface-2)",
            border: "1px solid var(--line-2)",
            padding: "10px 14px",
            fontFamily: "var(--mono)",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.32em",
            color: "var(--ink)",
            display: "flex",
            alignItems: "center",
          }}
        >
          {code || "——————"}
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copier le code d'invitation"
          className={styles["btn-mini"]}
          style={{ flexShrink: 0, padding: "0 14px" }}
        >
          {copied ? "Copié" : "Copier"}
        </button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Partager le code d'invitation"
          className={styles["btn-mini"]}
          style={{ flexShrink: 0, padding: "0 14px" }}
        >
          Partager
        </button>
      </div>
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--dim)",
        }}
      >
        Communiquez ce code à votre tireur
      </span>
    </div>
  );
}

function CardHeader({ s }: { s: DerivedShooter }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "var(--red-deep)",
          border: "1px solid var(--red)",
          color: "var(--ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--display)",
          fontSize: 18,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {initials(s.row.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--display)",
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              color: "var(--ink)",
              lineHeight: 1.1,
            }}
          >
            {s.row.name}
          </h3>
          <span
            className={styles.badge}
            style={{
              color: LEVEL_PALETTE[s.level],
              borderColor: LEVEL_PALETTE[s.level],
            }}
          >
            {LEVEL_LABELS[s.level]}
          </span>
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--dim)",
          }}
        >
          {[s.club, `Inscrit ${fmtDot(s.row.linked_at ?? null, true)}`]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
    </div>
  );
}

function CardStats({ s }: { s: DerivedShooter }) {
  const stats: {
    label: string;
    value: string;
    delta: number;
    unit: string;
    precision?: number;
    lowerIsBetter?: boolean;
    note?: string;
  }[] = [
    {
      label: "Sessions",
      value: String(s.sessionsCount),
      delta: s.sessionsDelta,
      unit: "",
    },
    {
      label: "Dernière (score)",
      value: s.lastScore > 0 ? s.lastScore.toFixed(1) : "—",
      delta: s.scoreDelta,
      unit: "pts",
      note: s.lastModule ? moduleLabel(s.lastModule) : undefined,
    },
    {
      label: "Accuracy (dernière)",
      value: s.accuracy > 0 ? `${s.accuracy}%` : "—",
      delta: s.accDelta,
      unit: "pts",
    },
    {
      label: "Hit Factor",
      value: s.lastHitFactor != null ? s.lastHitFactor.toFixed(2) : "—",
      delta: 0,
      unit: "",
    },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
      }}
    >
      {stats.map((st) => {
        const delta = st.delta;
        const positiveDir = st.lowerIsBetter ? delta < 0 : delta > 0;
        const negativeDir = st.lowerIsBetter ? delta > 0 : delta < 0;
        const color = positiveDir
          ? "var(--green)"
          : negativeDir
            ? "var(--red)"
            : "var(--dim)";
        const arrow = delta === 0 ? "·" : delta > 0 ? "↑" : "↓";
        const deltaText =
          delta === 0
            ? "—"
            : st.precision != null
              ? `${arrow} ${Math.abs(delta).toFixed(st.precision)}${st.unit}`
              : `${arrow} ${Math.abs(delta)}${st.unit}`;
        return (
          <div
            key={st.label}
            style={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--dim-2)",
              }}
            >
              {st.label}
            </span>
            <span
              style={{
                fontFamily: "var(--display)",
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              {st.value}
            </span>
            {st.note && (
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--dim)",
                }}
              >
                {st.note}
              </span>
            )}
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color,
              }}
            >
              {deltaText}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CardFooter({ s }: { s: DerivedShooter }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        paddingTop: 12,
        borderTop: "1px solid var(--line)",
        fontFamily: "var(--mono)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--dim)",
      }}
    >
      <span>Dernière · {relTime(s.lastActivity)}</span>
    </div>
  );
}

function CardFlag({ flag }: { flag: DerivedShooter["flag"] }) {
  if (!flag) return null;
  if (flag === "stagne") {
    return (
      <div
        style={{
          background: "rgba(245,166,35,0.12)",
          border: "1px solid var(--amber)",
          color: "var(--amber)",
          padding: "6px 10px",
          fontFamily: "var(--mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        ⚠ Stagne 4 sem.
      </div>
    );
  }
  if (flag === "rapide") {
    return (
      <div
        style={{
          background: "rgba(90,217,155,0.1)",
          border: "1px solid var(--green)",
          color: "var(--green)",
          padding: "6px 10px",
          fontFamily: "var(--mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        ★ Progression rapide
      </div>
    );
  }
  return (
    <span
      style={{
        color: "var(--red)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      Reprendre contact
    </span>
  );
}

function InvitePlaceholder() {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px dashed var(--line-2)",
        padding: 32,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 160,
      }}
    >
      <span
        style={{
          fontFamily: "var(--display)",
          fontSize: 32,
          fontWeight: 500,
          color: "var(--dim-2)",
          lineHeight: 1,
        }}
      >
        +
      </span>
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--dim)",
        }}
      >
        Inviter un tireur
      </span>
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--dim-2)",
        }}
      >
        Code · Email · QR
      </span>
    </div>
  );
}

/* ──────────────  Shooter list row (alternate view)  ────────────── */

function ShooterListRow({ s, onOpen }: { s: DerivedShooter; onOpen: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ouvrir la fiche de ${s.row.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`${styles["st-row"]} ${styles["row-link"]}`}
      style={{ gridTemplateColumns: LIST_COLS }}
    >
      <div className={styles.nm}>
        {s.row.name}
        <span className={styles.s}>{s.club || "—"}</span>
      </div>
      <span
        className={styles.badge}
        style={{
          color: LEVEL_PALETTE[s.level],
          borderColor: LEVEL_PALETTE[s.level],
          justifySelf: "start",
        }}
      >
        {LEVEL_LABELS[s.level]}
      </span>
      <span className={styles.score}>
        {s.lastScore > 0 ? s.lastScore.toFixed(1) : "—"}
      </span>
      <span className={styles.num}>
        {s.accuracy > 0 ? `${s.accuracy}%` : "—"}
      </span>
      <span className={styles.date}>{relTime(s.lastActivity)}</span>
    </div>
  );
}

/* ──────────────  Right panels  ────────────── */

function PanelTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className={styles["panel-head"]}>
      <span className={styles.title}>{title}</span>
      {meta != null && <span>{meta}</span>}
    </div>
  );
}

function LeaderboardPanel({
  entries,
  selfName,
}: {
  entries: DerivedShooter[];
  selfName: string;
}) {
  return (
    <section className={styles.panel}>
      <PanelTitle title="Leaderboard · Score (dernière séance)" />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.length === 0 ? (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--dim-2)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Pas de classement
          </span>
        ) : (
          entries.map((e, i) => {
            const isSelf = selfName && e.row.name.toLowerCase().includes(selfName.toLowerCase());
            return (
              <div
                key={e.row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "20px 28px 1fr auto",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--dim-2)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--red-deep)",
                    border: "1px solid var(--red)",
                    color: "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--display)",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {initials(e.row.name)}
                </div>
                <span
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: isSelf ? "var(--ink)" : "var(--dim)",
                    textDecoration: isSelf ? "underline" : "none",
                    textTransform: "uppercase",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.row.name} ·{" "}
                  <span style={{ color: "var(--dim-2)", fontSize: 10 }}>
                    {LEVEL_LABELS[e.level].split(" ")[0]}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--red)",
                  }}
                >
                  {e.lastScore > 0 ? e.lastScore.toFixed(1) : "—"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function InvitationsPanel({
  shooters,
  onDelete,
}: {
  shooters: DerivedShooter[];
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <section className={styles.panel}>
      <PanelTitle
        title="Invitations en attente"
        meta={String(shooters.length).padStart(2, "0")}
      />
      <div style={{ padding: 16 }}>
        {shooters.length === 0 ? (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--dim-2)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Aucune invitation
          </span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {shooters.map((s) => (
              <div
                key={s.row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.row.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--dim-2)",
                    }}
                  >
                    {s.row.specialite || "—"} ·{" "}
                    {fmtDot(s.row.linked_at ?? null, true)}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Supprimer l'invitation"
                  className={styles["btn-mini"]}
                  onClick={() => onDelete(s.row.id, s.row.name)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function GroupsPanel({ groups }: { groups: [string, number][] }) {
  return (
    <section className={styles.panel}>
      <PanelTitle title="Groupes · Classes" />
      <div style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {groups.map(([label, count]) => {
          const tint = LEVEL_PALETTE[label.split(" ")[0]];
          return (
            <span
              key={label}
              className={styles.chip}
              style={tint ? { color: tint, borderColor: tint } : undefined}
            >
              {label}
              <span className={styles.k}>{count}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

function ActivityFeedPanel({
  events,
}: {
  events: {
    shooter: DerivedShooter;
    label: string;
    value: string;
    color: string;
    at: Date;
  }[];
}) {
  return (
    <section className={styles.panel}>
      <PanelTitle title="Activité tireurs · Live" />
      <div style={{ padding: 16 }}>
        {events.length === 0 ? (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--dim-2)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Aucune activité récente
          </span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {events.map((e, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "8px 1fr auto",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: e.color,
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {e.shooter.row.name}{" "}
                    <span style={{ color: "var(--dim)", fontWeight: 500 }}>
                      · {e.label} · {e.value}
                    </span>
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--dim-2)",
                  }}
                >
                  {relTime(e.at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ──────────────  Icons  ────────────── */

function IconGrid() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
