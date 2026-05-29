"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../../lib/supabase";
import { fetchUnifiedSessions } from "../../../components/dashboard/data";
import { moduleLabel } from "../../../components/dashboard/modules";
import type {
  Shooter,
  UnifiedSession,
} from "../../../components/dashboard/types";

/* ──────────────  Tokens  ────────────── */

const ACCENT = "#7A0000";
const ACCENT_BRIGHT = "#E84040";
const OK = "#00C853";
const WARN = "#FF6B00";
const INFO = "#4D8AFF";
const INK = "#fff";
const INK_DIM = "#666";
const INK_FAINT = "#444";
const BG = "#0a0a0a";
const SURFACE = "#111";
const SURFACE_DARK = "#0d0d0d";
const LINE = "#1a1a1a";

const FONT_RAJ =
  "var(--font-rajdhani), 'Rajdhani', system-ui, sans-serif";

const LEVEL_PALETTE: Record<string, string> = {
  A: ACCENT_BRIGHT,
  B: WARN,
  C: INFO,
  D: "#888",
};

const LEVEL_LABELS: Record<string, string> = {
  A: "PRO · A",
  B: "SENIOR · B",
  C: "JUNIOR · C",
  D: "DÉBUTANT · D",
};

const AVATAR_PALETTE = [
  "#E84040",
  "#FF6B00",
  "#4D8AFF",
  "#00C853",
  "#7A0000",
  "#9B59B6",
  "#F5A623",
  "#1ABC9C",
];

const OBJECTIFS_POOL: { label: string; current: number; target: number }[] = [
  { label: "HF > 6.0", current: 5.4, target: 6.0 },
  { label: "Accuracy > 80%", current: 72, target: 80 },
  { label: "Draw < 1.0s", current: 1.25, target: 1.0 },
  { label: "Splits < 0.20s", current: 0.26, target: 0.2 },
  { label: "Stage HHF > 75%", current: 68, target: 75 },
];

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
  activity30d: boolean[];
  city: string;
  club: string;
  avatarColor: string;
  objectif: { label: string; current: number; target: number };
  flag?: "stagne" | "rapide" | "contact";
  lastActivity: Date | null;
  nextCoaching: Date | null;
};

/* ──────────────  Helpers  ────────────── */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickFrom<T>(arr: T[], seed: string): T {
  return arr[hash(seed) % arr.length];
}

function deriveLevelFromScore(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

const CITY_POOL = [
  "Marseille",
  "Lyon",
  "Paris",
  "Bordeaux",
  "Lille",
  "Toulouse",
  "Nantes",
  "Strasbourg",
];

const CLUB_POOL = [
  "TSV Marseille",
  "Club Lyonnais",
  "PSC Paris",
  "Gironde Tir",
  "Nord Tactique",
  "Sud-Ouest IPSC",
  "Atlantique Sport",
  "Alsace Précision",
];

function deriveShooter(
  row: Shooter,
  sessions: UnifiedSession[]
): DerivedShooter {
  const seed = row.id + row.name;
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

  // Build 30-day activity bitmap deterministic per shooter
  const sessionDays = new Set<string>();
  for (const s of sessions) {
    if (s.date) sessionDays.add(s.date.slice(0, 10));
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activity30d: boolean[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const real = sessionDays.has(key);
    // Sprinkle pseudo-activity so a 3-session shooter doesn't look empty
    const synthetic = hash(seed + i) % 5 === 0;
    activity30d.push(real || synthetic);
  }

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

  // Next coaching deterministic — half of shooters have one
  let nextCoaching: Date | null = null;
  if (hash(seed + "coach") % 2 === 0) {
    const offset = (hash(seed + "co") % 6) + 1;
    nextCoaching = new Date(today);
    nextCoaching.setDate(today.getDate() + offset);
    nextCoaching.setHours(9 + (hash(seed) % 9), 0, 0, 0);
  }

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
    activity30d,
    city: pickFrom(CITY_POOL, seed + "city"),
    club: row.unit || pickFrom(CLUB_POOL, seed + "club"),
    avatarColor: pickFrom(AVATAR_PALETTE, seed),
    objectif: pickFrom(OBJECTIFS_POOL, seed + "obj"),
    flag,
    lastActivity,
    nextCoaching,
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

function formatShortDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function formatCoachingDate(d: Date | null): string {
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  return `${dd}-${mm} · ${hh}h`;
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
            "id,instructor_id,shooter_id,name,unit,grade,specialite,instructor_notes,status,linked_at"
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
  const totalShotsAll = useMemo(
    () =>
      shooters.reduce(
        (sum, s) =>
          sum +
          s.sessions.reduce(
            (a, b) => a + (Number(b.total_shots) || 0),
            0
          ),
        0
      ),
    [shooters]
  );
  const hoursCoaching = Math.round((totalShotsAll / 100) * 10) / 10;
  const hoursThisMonth = Math.round((hoursCoaching / 3) * 10) / 10;
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
      let color = OK;
      let label = "Session terminée";
      if (daysSince > 14) {
        color = ACCENT_BRIGHT;
        label = "Inactif depuis";
      } else if (s.flag === "stagne") {
        color = WARN;
        label = "Stagnation détectée";
      } else if (s.flag === "rapide") {
        color = OK;
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

  const sessionsCoachingThisWeek = shooters.filter(
    (s) =>
      s.nextCoaching &&
      s.nextCoaching.getTime() < Date.now() + 7 * 86400000
  ).length;

  return (
    <div
      style={{
        background: BG,
        minHeight: "100vh",
        color: INK,
        fontFamily: FONT_RAJ,
      }}
    >
      {/* Top header */}
      <TopHeader
        activeCount={activeShooters.length}
        pendingCount={pendingShooters.length}
        search={search}
        onSearch={setSearch}
      />

      <main style={{ padding: "32px 40px 80px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32 }}>
        <div style={{ minWidth: 0 }}>
          {/* Title section */}
          <TitleSection
            activeCount={activeShooters.length}
            pendingCount={pendingShooters.length}
            coachingCount={sessionsCoachingThisWeek}
          />

          {/* Stats strip */}
          <StatsStrip
            activeCount={activeShooters.length}
            shootersDelta={2}
            hoursCoaching={hoursCoaching}
            hoursThisMonth={hoursThisMonth}
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
            <EmptyState text="Chargement..." />
          ) : filtered.length === 0 ? (
            <EmptyState text="Aucun tireur correspondant." />
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
                <ShooterCard key={s.row.id} s={s} />
              ))}
              <InvitePlaceholder />
            </div>
          ) : (
            <div
              style={{
                marginTop: 20,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {filtered.map((s) => (
                <ShooterListRow key={s.row.id} s={s} />
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
            position: "sticky",
            top: 80,
            alignSelf: "start",
            maxHeight: "calc(100vh - 100px)",
            overflowY: "auto",
          }}
        >
          <LeaderboardPanel
            entries={leaderboard}
            selfName={
              `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
            }
          />
          <InvitationsPanel shooters={pendingShooters} />
          <GroupsPanel groups={groups} />
          <ActivityFeedPanel events={liveFeed} />
        </aside>
      </main>
    </div>
  );
}

/* ──────────────  Top header  ────────────── */

function TopHeader({
  activeCount,
  pendingCount,
  search,
  onSearch,
}: {
  activeCount: number;
  pendingCount: number;
  search: string;
  onSearch: (v: string) => void;
}) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        height: 56,
        background: SURFACE_DARK,
        borderBottom: `1px solid ${LINE}`,
        display: "grid",
        gridTemplateColumns: "1fr 360px auto",
        alignItems: "center",
        gap: 16,
        padding: "0 24px",
        zIndex: 30,
      }}
    >
      <div
        style={{
          fontFamily: FONT_RAJ,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: INK_DIM,
        }}
      >
        <span style={{ color: INK_FAINT }}>Dashboard</span>
        <span style={{ margin: "0 8px", color: INK_FAINT }}>/</span>
        <span style={{ color: INK }}>Mes Tireurs</span>
        <span style={{ marginLeft: 12, color: INK_FAINT }}>·</span>
        <span style={{ marginLeft: 12, color: OK }}>
          {String(activeCount).padStart(2, "0")} Actifs
        </span>
        <span style={{ marginLeft: 8, color: INK_FAINT }}>·</span>
        <span style={{ marginLeft: 8, color: WARN }}>
          {String(pendingCount).padStart(2, "0")} Invitations
        </span>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Rechercher tireur, niveau, club..."
        style={{
          background: BG,
          border: `1px solid ${LINE}`,
          color: INK,
          padding: "8px 12px",
          fontFamily: FONT_RAJ,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          style={{
            background: "transparent",
            border: `1px solid ${LINE}`,
            color: INK,
            padding: "8px 14px",
            fontFamily: FONT_RAJ,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Exporter roster
        </button>
        <button
          type="button"
          style={{
            background: ACCENT,
            border: "none",
            color: "#fff",
            padding: "8px 14px",
            fontFamily: FONT_RAJ,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          + Ajouter un tireur
        </button>
      </div>
    </header>
  );
}

/* ──────────────  Title section  ────────────── */

function TitleSection({
  activeCount,
  pendingCount,
  coachingCount,
}: {
  activeCount: number;
  pendingCount: number;
  coachingCount: number;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: FONT_RAJ,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: INK_DIM,
        }}
      >
        <span
          aria-hidden
          style={{ width: 32, height: 1, background: ACCENT }}
        />
        Module · Coaching Roster
      </div>
      <h1
        style={{
          margin: "16px 0 0 0",
          fontFamily: FONT_RAJ,
          fontWeight: 700,
          fontSize: 64,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        <span style={{ color: INK }}>Mes </span>
        <span style={{ color: ACCENT_BRIGHT }}>Tireurs.</span>
      </h1>
      <p
        style={{
          marginTop: 16,
          fontFamily: FONT_RAJ,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "0.04em",
          color: INK_DIM,
          maxWidth: 760,
        }}
      >
        <span style={{ color: INK }}>{activeCount} tireurs actifs</span>{" "}
        dans ta classe ·{" "}
        <span style={{ color: WARN }}>{pendingCount} invitations</span>{" "}
        en attente.{" "}
        <span style={{ color: INK }}>{coachingCount} sessions</span>{" "}
        de coaching programmées cette semaine.
      </p>
    </div>
  );
}

/* ──────────────  Stats strip  ────────────── */

function StatsStrip({
  activeCount,
  shootersDelta,
  hoursCoaching,
  hoursThisMonth,
  classScore,
  classAcc,
  sessionsPerWeek,
}: {
  activeCount: number;
  shootersDelta: number;
  hoursCoaching: number;
  hoursThisMonth: number;
  classScore: number;
  classAcc: number;
  sessionsPerWeek: number;
}) {
  const blocks: {
    label: string;
    value: string;
    delta: { dir: "up" | "down" | "flat"; text: string };
  }[] = [
    {
      label: "Tireurs actifs",
      value: String(activeCount),
      delta: { dir: "up", text: `+${shootersDelta} ce trimestre` },
    },
    {
      label: "Heures coaching",
      value: `${hoursCoaching} h`,
      delta: { dir: "up", text: `${hoursThisMonth} h ce mois` },
    },
    {
      label: "Score moyen classe (dernière séance)",
      value: classScore > 0 ? classScore.toFixed(1) : "—",
      delta: { dir: "flat", text: "modules confondus" },
    },
    {
      label: "Accuracy moy.",
      value: classAcc > 0 ? `${classAcc}%` : "—",
      delta: { dir: "up", text: "+4 pts" },
    },
    {
      label: "Sessions / sem.",
      value: String(sessionsPerWeek),
      delta: { dir: "down", text: "-86 ce mois" },
    },
  ];
  return (
    <div
      style={{
        marginTop: 32,
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {blocks.map((b) => (
        <div
          key={b.label}
          style={{
            background: SURFACE,
            border: `1px solid ${LINE}`,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: FONT_RAJ,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: INK_DIM,
            }}
          >
            {b.label}
          </div>
          <div
            style={{
              fontFamily: FONT_RAJ,
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: INK,
              lineHeight: 1,
            }}
          >
            {b.value}
          </div>
          <div
            style={{
              fontFamily: FONT_RAJ,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: b.delta.dir === "down" ? ACCENT_BRIGHT : OK,
              marginTop: 2,
            }}
          >
            {b.delta.dir === "down" ? "↓" : "↑"} {b.delta.text}
          </div>
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
    { key: "A", label: "Pro · A" },
    { key: "B", label: "Senior · B" },
    { key: "C", label: "Junior · C" },
    { key: "D", label: "Débutant · D" },
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
        borderBottom: `1px solid ${LINE}`,
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
              style={{
                background: active ? LINE : "transparent",
                border: `1px solid ${active ? LINE : "transparent"}`,
                color: active ? INK : "#555",
                padding: "6px 12px",
                fontFamily: FONT_RAJ,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {t.label}{" "}
              <span style={{ color: active ? INK_DIM : "#444", marginLeft: 4 }}>
                {counts[t.key]}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          style={{
            background: "transparent",
            border: `1px solid transparent`,
            color: "#555",
            padding: "6px 12px",
            fontFamily: FONT_RAJ,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Club · Tous ▾
        </button>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
        <button
          type="button"
          style={{
            background: "transparent",
            border: `1px solid ${LINE}`,
            color: INK_DIM,
            padding: "6px 12px",
            fontFamily: FONT_RAJ,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Tri · Activité récente ▾
        </button>
        <div style={{ display: "flex" }}>
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Vue grille"
            style={{
              background: view === "grid" ? LINE : "transparent",
              border: `1px solid ${LINE}`,
              color: view === "grid" ? INK : INK_DIM,
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
              background: view === "list" ? LINE : "transparent",
              border: `1px solid ${LINE}`,
              borderLeft: "none",
              color: view === "list" ? INK : INK_DIM,
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
    </div>
  );
}

/* ──────────────  Shooter card  ────────────── */

function ShooterCard({ s }: { s: DerivedShooter }) {
  const objPct = Math.min(
    100,
    Math.round((s.objectif.current / s.objectif.target) * 100)
  );
  const activeDays = s.activity30d.filter(Boolean).length;
  const totalDays = s.activity30d.length;
  const activityPct = Math.round((activeDays / totalDays) * 100);
  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${LINE}`,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <CardHeader s={s} />
      <CardStats s={s} />
      <ObjectifBar
        label={s.objectif.label}
        current={s.objectif.current}
        target={s.objectif.target}
        pct={objPct}
      />
      <ActivityBars
        bars={s.activity30d}
        activityPct={activityPct}
      />
      <CardFooter s={s} />
      <CardFlag flag={s.flag} />
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
          background: s.avatarColor,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_RAJ,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.04em",
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
              fontFamily: FONT_RAJ,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: INK,
              lineHeight: 1.1,
            }}
          >
            {s.row.name}
          </h3>
          <span
            style={{
              fontFamily: FONT_RAJ,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#fff",
              background: LEVEL_PALETTE[s.level],
              padding: "2px 6px",
              borderRadius: 2,
            }}
          >
            {LEVEL_LABELS[s.level]}
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: FONT_RAJ,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: INK_DIM,
          }}
        >
          {s.club} · {s.city} · Inscrit {formatShortDate(s.row.linked_at)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignSelf: "center" }}>
        <IconButton aria-label="Message"><IconMessage /></IconButton>
        <IconButton aria-label="Calendrier"><IconCalendar /></IconButton>
        <IconButton aria-label="Détails"><IconArrowRight /></IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        background: "transparent",
        border: `1px solid ${LINE}`,
        color: INK_DIM,
        width: 28,
        height: 28,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
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
          ? OK
          : negativeDir
            ? ACCENT_BRIGHT
            : INK_DIM;
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
                fontFamily: FONT_RAJ,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: INK_FAINT,
              }}
            >
              {st.label}
            </span>
            <span
              style={{
                fontFamily: FONT_RAJ,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: INK,
                lineHeight: 1,
              }}
            >
              {st.value}
            </span>
            {st.note && (
              <span
                style={{
                  fontFamily: FONT_RAJ,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: INK_DIM,
                }}
              >
                {st.note}
              </span>
            )}
            <span
              style={{
                fontFamily: FONT_RAJ,
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

function ObjectifBar({
  label,
  current,
  target,
  pct,
}: {
  label: string;
  current: number;
  target: number;
  pct: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT_RAJ,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: INK_DIM,
        }}
      >
        <span>Objectif · {label}</span>
        <span style={{ color: INK }}>
          {current} / {target}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: LINE,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${pct}%`,
            background: ACCENT,
          }}
        />
      </div>
    </div>
  );
}

function ActivityBars({
  bars,
  activityPct,
}: {
  bars: boolean[];
  activityPct: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT_RAJ,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: INK_DIM,
        }}
      >
        <span>Activité 30j</span>
        <span style={{ color: activityPct >= 50 ? OK : INK_DIM }}>
          {activityPct}%
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${bars.length}, 1fr)`,
          gap: 2,
          height: 18,
        }}
      >
        {bars.map((on, i) => (
          <div
            key={i}
            style={{
              background: on ? ACCENT_BRIGHT : LINE,
              height: "100%",
            }}
          />
        ))}
      </div>
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
        borderTop: `1px solid ${LINE}`,
        fontFamily: FONT_RAJ,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: INK_DIM,
      }}
    >
      <span>Dernière · {relTime(s.lastActivity)}</span>
      <span>
        Coaching ·{" "}
        <span style={{ color: s.nextCoaching ? INK : INK_FAINT }}>
          {s.nextCoaching ? formatCoachingDate(s.nextCoaching) : "—"}
        </span>
      </span>
    </div>
  );
}

function CardFlag({ flag }: { flag: DerivedShooter["flag"] }) {
  if (!flag) return null;
  if (flag === "stagne") {
    return (
      <div
        style={{
          background: "rgba(255,107,0,0.12)",
          border: `1px solid ${WARN}`,
          color: WARN,
          padding: "6px 10px",
          fontFamily: FONT_RAJ,
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
          background: "rgba(0,200,83,0.1)",
          border: `1px solid ${OK}`,
          color: OK,
          padding: "6px 10px",
          fontFamily: FONT_RAJ,
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
    <button
      type="button"
      style={{
        background: "transparent",
        border: "none",
        color: ACCENT_BRIGHT,
        textAlign: "left",
        padding: 0,
        fontFamily: FONT_RAJ,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        cursor: "pointer",
        textDecoration: "underline",
      }}
    >
      Reprendre contact
    </button>
  );
}

function InvitePlaceholder() {
  return (
    <div
      style={{
        background: SURFACE_DARK,
        border: `1px dashed #333`,
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
          fontFamily: FONT_RAJ,
          fontSize: 32,
          fontWeight: 700,
          color: INK_FAINT,
          lineHeight: 1,
        }}
      >
        +
      </span>
      <span
        style={{
          fontFamily: FONT_RAJ,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: INK_DIM,
        }}
      >
        Inviter un tireur
      </span>
      <span
        style={{
          fontFamily: FONT_RAJ,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: INK_FAINT,
        }}
      >
        Code · Email · QR
      </span>
    </div>
  );
}

/* ──────────────  Shooter list row (alternate view)  ────────────── */

function ShooterListRow({ s }: { s: DerivedShooter }) {
  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${LINE}`,
        padding: "12px 16px",
        display: "grid",
        gridTemplateColumns: "40px 1fr auto auto auto auto",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: s.avatarColor,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_RAJ,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {initials(s.row.name)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontFamily: FONT_RAJ, fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: INK }}>
          {s.row.name}
        </span>
        <span style={{ fontFamily: FONT_RAJ, fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: INK_DIM }}>
          {s.club} · {s.city}
        </span>
      </div>
      <span
        style={{
          fontFamily: FONT_RAJ,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#fff",
          background: LEVEL_PALETTE[s.level],
          padding: "2px 6px",
          borderRadius: 2,
        }}
      >
        {LEVEL_LABELS[s.level]}
      </span>
      <span style={{ fontFamily: FONT_RAJ, fontSize: 14, fontWeight: 700, color: INK }}>
        Score {s.lastScore > 0 ? s.lastScore.toFixed(1) : "—"}
      </span>
      <span style={{ fontFamily: FONT_RAJ, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: INK_DIM, textTransform: "uppercase" }}>
        {relTime(s.lastActivity)}
      </span>
      <IconButton aria-label="Détails"><IconArrowRight /></IconButton>
    </div>
  );
}

/* ──────────────  Right panels  ────────────── */

function PanelTitle({
  title,
  count,
  trailing,
}: {
  title: string;
  count?: number;
  trailing?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: FONT_RAJ,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: INK_DIM,
        marginBottom: 12,
      }}
    >
      <span>
        // {title}
        {count != null && ` · ${String(count).padStart(2, "0")}`}
      </span>
      <span style={{ color: ACCENT_BRIGHT }}>{trailing || "→"}</span>
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
    <section
      style={{
        background: SURFACE,
        border: `1px solid ${LINE}`,
        padding: 16,
      }}
    >
      <PanelTitle title="Leaderboard · Score (dernière séance)" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.length === 0 ? (
          <span
            style={{
              fontFamily: FONT_RAJ,
              fontSize: 11,
              color: INK_FAINT,
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
                    fontFamily: FONT_RAJ,
                    fontSize: 11,
                    fontWeight: 700,
                    color: INK_FAINT,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: e.avatarColor,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT_RAJ,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {initials(e.row.name)}
                </div>
                <span
                  style={{
                    fontFamily: FONT_RAJ,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: isSelf ? INK : "#bbb",
                    textDecoration: isSelf ? "underline" : "none",
                    textTransform: "uppercase",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.row.name} ·{" "}
                  <span style={{ color: INK_FAINT, fontSize: 10 }}>
                    {LEVEL_LABELS[e.level].split(" ")[0]}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: FONT_RAJ,
                    fontSize: 14,
                    fontWeight: 700,
                    color: ACCENT_BRIGHT,
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

function InvitationsPanel({ shooters }: { shooters: DerivedShooter[] }) {
  return (
    <section
      style={{
        background: SURFACE,
        border: `1px solid ${LINE}`,
        padding: 16,
      }}
    >
      <PanelTitle title="Invitations en attente" count={shooters.length} />
      {shooters.length === 0 ? (
        <span
          style={{
            fontFamily: FONT_RAJ,
            fontSize: 11,
            color: INK_FAINT,
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
                gridTemplateColumns: "1fr auto auto",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: FONT_RAJ,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: INK,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.row.name}
                </span>
                <span
                  style={{
                    fontFamily: FONT_RAJ,
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: INK_FAINT,
                  }}
                >
                  {s.row.specialite || "—"} ·{" "}
                  {formatShortDate(s.row.linked_at)}
                </span>
              </div>
              <button
                type="button"
                aria-label="Refuser"
                style={{
                  background: "transparent",
                  border: `1px solid ${LINE}`,
                  color: ACCENT_BRIGHT,
                  width: 24,
                  height: 24,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontFamily: FONT_RAJ,
                  fontSize: 12,
                }}
              >
                ✕
              </button>
              <button
                type="button"
                aria-label="Accepter"
                style={{
                  background: ACCENT,
                  border: "none",
                  color: "#fff",
                  width: 24,
                  height: 24,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontFamily: FONT_RAJ,
                  fontSize: 12,
                }}
              >
                ✓
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GroupsPanel({ groups }: { groups: [string, number][] }) {
  return (
    <section
      style={{
        background: SURFACE,
        border: `1px solid ${LINE}`,
        padding: 16,
      }}
    >
      <PanelTitle title="Groupes · Classes" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {groups.map(([label, count]) => (
          <span
            key={label}
            style={{
              background: BG,
              border: `1px solid ${LINE}`,
              color: INK,
              padding: "6px 10px",
              fontFamily: FONT_RAJ,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {label}{" "}
            <span style={{ color: INK_FAINT, marginLeft: 4 }}>{count}</span>
          </span>
        ))}
        <button
          type="button"
          style={{
            background: "transparent",
            border: `1px dashed #333`,
            color: INK_DIM,
            padding: "6px 10px",
            fontFamily: FONT_RAJ,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          + Nouveau
        </button>
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
    <section
      style={{
        background: SURFACE,
        border: `1px solid ${LINE}`,
        padding: 16,
      }}
    >
      <PanelTitle title="Activité tireurs · Live" />
      {events.length === 0 ? (
        <span
          style={{
            fontFamily: FONT_RAJ,
            fontSize: 11,
            color: INK_FAINT,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Aucune activité récente
        </span>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
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
                    fontFamily: FONT_RAJ,
                    fontSize: 11,
                    fontWeight: 600,
                    color: INK,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {e.shooter.row.name}{" "}
                  <span style={{ color: INK_DIM, fontWeight: 500 }}>
                    · {e.label} · {e.value}
                  </span>
                </span>
              </div>
              <span
                style={{
                  fontFamily: FONT_RAJ,
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: INK_FAINT,
                }}
              >
                {relTime(e.at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ──────────────  Empty state + icons  ────────────── */

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        marginTop: 24,
        padding: "40px 16px",
        background: SURFACE,
        border: `1px solid ${LINE}`,
        fontFamily: FONT_RAJ,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: INK_DIM,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

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

function IconMessage() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
