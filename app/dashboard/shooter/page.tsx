"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getSupabase } from "@/lib/supabase";
import {
  fetchAssignments,
  fetchModuleSessionById,
  fetchSessionFeedback,
  fetchUnifiedSessions,
  formatDate,
  isPro,
  type ModuleSessionRow,
  type SessionFeedbackRow,
} from "@/components/dashboard/data";
import { moduleColor, moduleLabel } from "@/components/dashboard/modules";
import styles from "./fiche.module.css";
import { ProgressionChart } from "@/components/dashboard/ProgressionChart";
import { NewAssignmentModal } from "@/components/dashboard/NewAssignmentModal";
import { downloadSessionPdf } from "@/lib/sessionPdf";
import {
  AssignmentStatusBadge,
  Breadcrumb,
  Card,
  EmptyState,
  KpiTile,
  ProfileBadge,
  SectionTitle,
  ShooterStatusBadge,
} from "@/components/dashboard/ui";
import type {
  Assignment,
  ManualSession,
  Shooter,
  UnifiedSession,
} from "@/components/dashboard/types";

function fmtDot(iso: string | null, withYear = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return withYear
    ? `${dd} · ${mm} · ${String(d.getFullYear()).slice(-2)}`
    : `${dd} · ${mm}`;
}

function moduleBadgeClass(m: string | null): "spec" | "base" | "dry" | "flat" {
  if (m === "speciales") return "spec";
  if (m === "basique") return "base";
  if (m === "dry_fire") return "dry";
  return "flat";
}

const MOD_CHART_COLOR: Record<string, string> = {
  speciales: "#b455e6",
  basique: "#f5a623",
  dry_fire: "#4f8ff0",
};
function modChartColor(m: string | null): string {
  return (m && MOD_CHART_COLOR[m]) || "#888888";
}

function moduleShort(m: string | null): string {
  if (m === "speciales") return "SPÉC";
  if (m === "basique") return "BASE";
  if (m === "dry_fire") return "DRY";
  return moduleLabel(m).slice(0, 4).toUpperCase();
}

function fmtDM(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
function fmtSlash(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")} / ${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;
}

type ChartPt = {
  x: number;
  y: number;
  score: number;
  module: string | null;
  color: string;
  date: string;
};

export default function ShooterPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-10 font-mono text-xs uppercase tracking-[0.22em] text-[#666]">
          Chargement…
        </div>
      }
    >
      <ShooterDetail />
    </Suspense>
  );
}

function ShooterDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");

  const [shooter, setShooter] = useState<Shooter | null>(null);
  const [sessions, setSessions] = useState<UnifiedSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [instructorName, setInstructorName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // Horloge figée au mount (initializer pur côté React → pas de lint purity).
  const [now] = useState(() => Date.now());
  const [linkedSession, setLinkedSession] = useState<ModuleSessionRow | null>(
    null
  );
  const [linkedFeedback, setLinkedFeedback] =
    useState<SessionFeedbackRow | null>(null);
  const [linkedLoading, setLinkedLoading] = useState(false);

  const openLinkedSession = useCallback(async (sessionId: string) => {
    setLinkedLoading(true);
    setLinkedSession(null);
    setLinkedFeedback(null);
    try {
      const [row, feedback] = await Promise.all([
        fetchModuleSessionById(sessionId),
        fetchSessionFeedback([sessionId]),
      ]);
      setLinkedSession(row);
      setLinkedFeedback(feedback[0] ?? null);
    } catch {
      setLinkedSession(null);
      setLinkedFeedback(null);
    } finally {
      setLinkedLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const [{ data: shooterRow, error: sErr }, { data: sess }] = await Promise.all([
        sb
          .from("instructor_shooters")
          .select(
            "id,instructor_id,shooter_id,name,unit,grade,specialite,instructor_notes,status,linked_at"
          )
          .eq("id", id)
          .maybeSingle(),
        sb.auth.getSession(),
      ]);
      if (sErr) throw sErr;
      if (!shooterRow) {
        setError("Tireur introuvable");
        setShooter(null);
        setSessions([]);
        setAssignments([]);
        return;
      }
      const uid = sess?.session?.user.id;
      let pseudo = sess?.session?.user.email ?? "";
      if (uid) {
        const { data: prof } = await sb
          .from("profiles")
          .select("pseudo")
          .eq("id", uid)
          .maybeSingle();
        if (prof?.pseudo) pseudo = prof.pseudo;
      }
      const [ss, aa] = await Promise.all([
        fetchUnifiedSessions([shooterRow as Shooter]),
        fetchAssignments([id]),
      ]);
      setShooter(shooterRow as Shooter);
      setSessions(ss);
      setAssignments(aa);
      setInstructorName(pseudo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    // Meilleure séance = max normalized_score (pas une moyenne) + son module.
    let bestSession: ManualSession | null = null;
    for (const s of sessions) {
      if (
        typeof s.normalized_score === "number" &&
        (bestSession === null ||
          s.normalized_score > (bestSession.normalized_score as number))
      ) {
        bestSession = s;
      }
    }
    const bestScore = bestSession ? bestSession.normalized_score : null;
    const bestModule = bestSession?.module ?? null;
    const bestDate = bestSession?.date ?? null;

    // Headline = DERNIÈRE séance (un seul module). Jamais de moyenne inter-modules.
    // sessions triées par date desc (fetchUnifiedSessions) → [0] = dernière.
    const last = sessions[0] ?? null;
    const lastScore =
      last && typeof last.normalized_score === "number"
        ? last.normalized_score
        : null;
    const lastAccuracy =
      last && typeof last.accuracy === "number" ? last.accuracy : null;
    const lastModule = last?.module ?? null;
    const lastDate = last?.date ?? null;

    // Vrais "30 derniers jours" via horloge figée au mount (now).
    const sessions30d = sessions.filter((s) => {
      const t = +new Date(s.date);
      return !isNaN(t) && t >= now - 30 * 86400000;
    }).length;

    return {
      lastScore,
      lastAccuracy,
      lastModule,
      lastDate,
      bestScore,
      bestModule,
      bestDate,
      count: sessions.length,
      sessions30d,
    };
  }, [sessions, now]);

  const chart = useMemo(() => {
    const scored = sessions
      .filter((s) => typeof s.normalized_score === "number")
      .slice()
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const n = scored.length;
    const X0 = 80, X1 = 1080, YT = 40, YB = 280;
    const xAt = (i: number) =>
      n <= 1 ? (X0 + X1) / 2 : X0 + (i * (X1 - X0)) / (n - 1);
    const yAt = (sc: number) => YB - (sc * (YB - YT)) / 100;
    const pts: ChartPt[] = scored.map((s, i) => ({
      x: +xAt(i).toFixed(1),
      y: +yAt(s.normalized_score as number).toFixed(1),
      score: s.normalized_score as number,
      module: s.module,
      color: modChartColor(s.module),
      date: s.date,
    }));

    // 1 polyline par module (points du module reliés chronologiquement).
    const byModule = new Map<string, ChartPt[]>();
    pts.forEach((p) => {
      const k = p.module ?? "autre";
      const arr = byModule.get(k);
      if (arr) arr.push(p);
      else byModule.set(k, [p]);
    });
    const series = Array.from(byModule.entries()).map(([m, arr]) => ({
      module: m,
      color: modChartColor(m),
      polyline: arr.map((p) => `${p.x},${p.y}`).join(" "),
    }));

    // PR = meilleur score.
    let prIndex = -1;
    pts.forEach((p, i) => {
      if (prIndex === -1 || p.score > pts[prIndex].score) prIndex = i;
    });
    const pr = prIndex >= 0 ? pts[prIndex] : null;

    // Aire = remplissage sous la ligne du module dominant (celui du PR).
    let area = "";
    let areaColor: string | null = null;
    if (pr) {
      const arr = byModule.get(pr.module ?? "autre") ?? [];
      if (arr.length >= 2) {
        area =
          `M ${arr[0].x},${arr[0].y} ` +
          arr.slice(1).map((p) => `L ${p.x},${p.y} `).join("") +
          `L ${arr[arr.length - 1].x},${YB} L ${arr[0].x},${YB} Z`;
        areaColor = modChartColor(pr.module);
      }
    }

    // Tendance (régression linéaire index → score).
    let trend: { x1: number; y1: number; x2: number; y2: number } | null = null;
    let delta: number | null = null;
    if (n >= 2) {
      const mx = (n - 1) / 2;
      const my = pts.reduce((s, p) => s + p.score, 0) / n;
      let num = 0, den = 0;
      pts.forEach((p, i) => {
        num += (i - mx) * (p.score - my);
        den += (i - mx) ** 2;
      });
      const slope = den ? num / den : 0;
      const intercept = my - slope * mx;
      trend = {
        x1: xAt(0),
        y1: +yAt(intercept).toFixed(1),
        x2: xAt(n - 1),
        y2: +yAt(intercept + slope * (n - 1)).toFixed(1),
      };
      delta = Math.round(pts[n - 1].score - pts[0].score);
    }

    // Callout PR : à droite du point sauf si trop près du bord → à gauche.
    let callout:
      | { boxX: number; boxY: number; boxW: number; boxH: number }
      | null = null;
    if (pr) {
      const boxW = 96, boxH = 38, gap = 14;
      const toRight = pr.x + gap + boxW <= X1;
      const boxX = toRight ? pr.x + gap : pr.x - gap - boxW;
      let boxY = pr.y - boxH / 2;
      if (boxY < 8) boxY = 8;
      if (boxY > 340 - boxH - 8) boxY = 340 - boxH - 8;
      callout = {
        boxX: +boxX.toFixed(1),
        boxY: +boxY.toFixed(1),
        boxW,
        boxH,
      };
    }

    const labelStep = n > 7 ? Math.ceil(n / 6) : 1;
    const modulesPresent = Array.from(
      new Set(scored.map((s) => s.module ?? "autre"))
    );
    return {
      pts,
      series,
      pr,
      prIndex,
      area,
      areaColor,
      trend,
      delta,
      n,
      labelStep,
      modulesPresent,
      firstDate: pts[0]?.date ?? null,
      lastDate: pts[n - 1]?.date ?? null,
      callout,
    };
  }, [sessions]);

  const volume = useMemo(() => {
    const byMod = new Map<string, number>();
    let total = 0;
    for (const s of sessions) {
      const k = s.module ?? "autre";
      const shots = Number(s.total_shots) || 0;
      byMod.set(k, (byMod.get(k) ?? 0) + shots);
      total += shots;
    }
    const rows = Array.from(byMod.entries())
      .map(([module, shots]) => ({ module, shots }))
      .sort((a, b) => b.shots - a.shots);
    const max = rows.reduce((m, r) => Math.max(m, r.shots), 0);
    const dominant = rows.find((r) => r.shots > 0)?.module ?? null;
    const hasDry = rows.some((r) => r.module === "dry_fire");
    return { rows, total, max, dominant, hasDry };
  }, [sessions]);

  if (!id) {
    return (
      <div className="px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#E84040]">
          ID de tireur manquant
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.22em] text-[#888] hover:text-white"
        >
          ← Retour
        </Link>
      </div>
    );
  }

  return (
    <div className={`${styles.page} px-6 py-8 md:px-10 md:py-10`}>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Mes Tireurs", href: "/dashboard/mes-tireurs" },
          { label: shooter?.name ?? "…" },
        ]}
      />

      <button
        type="button"
        onClick={() => router.back()}
        className={styles["back-link"]}
      >
        <svg viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Retour aux tireurs
      </button>

      {error && (
        <div className="mb-6 border border-[#E84040]/50 bg-[#E84040]/[0.08] px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-[#E84040]">
          {error}
        </div>
      )}

      {loading && !shooter ? (
        <EmptyState>Chargement…</EmptyState>
      ) : !shooter ? null : (
        <>
          {/* HEADER */}
          <div className={styles["page-head"]}>
            <div>
              <div className={styles.eyebrow}>Module · Fiche tireur</div>
              <div className={styles["badge-row"]}>
                {isPro(shooter) && (
                  <span className={`${styles.badge} ${styles.pro}`}>Pro</span>
                )}
                <span
                  className={`${styles.badge} ${
                    shooter.status === "active" ? styles.actif : ""
                  }`}
                >
                  {shooter.status === "active" ? "Actif" : "En attente"}
                </span>
              </div>
              <div className={styles["id-line"]}>
                <div className={styles["id-avatar"]}>
                  {shooter.name.charAt(0).toUpperCase()}
                </div>
                <h1 className={styles.title}>{shooter.name}</h1>
              </div>
              <div className={styles["title-sub"]}>
                {[shooter.grade, shooter.unit].filter(Boolean).join(" · ") || "—"}
                {shooter.specialite && (
                  <>
                    {" · "}
                    <strong>{shooter.specialite}</strong>
                  </>
                )}
              </div>
            </div>
            <div className={styles["head-meta"]}>
              <div className={styles.stat}>
                <span>Lié depuis</span>
                <strong>{formatDate(shooter.linked_at)}</strong>
              </div>
            </div>
          </div>

          {/* NOTES INSTRUCTEUR */}
          <div className={styles.panel} style={{ marginBottom: 32 }}>
            <div className={styles["panel-head"]}>
              <span className={styles.title}>Notes instructeur</span>
              <span>Privé · visible coach</span>
            </div>
            <div className={styles.notes}>
              <span className={styles.tag}>Profil</span>
              <div className={styles.chips}>
                <span className={styles.chip}>
                  <span className={styles.k}>Origine</span>{" "}
                  {shooter.shooter_id ? "App" : "Manuel"}
                </span>
                <span className={styles.chip}>
                  <span className={styles.k}>Profil</span>{" "}
                  {isPro(shooter) ? "Pro" : "Civil"}
                </span>
                {shooter.specialite && (
                  <span className={styles.chip}>
                    <span className={styles.k}>Rôle</span> {shooter.specialite}
                  </span>
                )}
                {(shooter.grade || shooter.unit) && (
                  <span className={styles.chip}>
                    <span className={styles.k}>Unité</span>{" "}
                    {[shooter.grade, shooter.unit].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              {shooter.instructor_notes && (
                <p className={styles["note-free"]}>{shooter.instructor_notes}</p>
              )}
            </div>
          </div>

          {/* KPI GRID */}
          <div className={styles["kpi-grid"]}>
            {/* Sessions */}
            <div className={styles.kpi}>
              <div className={styles["kpi-head"]}>
                <span className={styles["kpi-l"]}>Sessions</span>
                {stats.sessions30d > 0 ? (
                  <span className={`${styles["kpi-badge"]} ${styles.up}`}>
                    ↗ +{stats.sessions30d} / 30j
                  </span>
                ) : (
                  <span className={`${styles["kpi-badge"]} ${styles.flat}`}>—</span>
                )}
              </div>
              <span className={styles["kpi-v"]}>{stats.count}</span>
              <span className={styles["kpi-sub"]}>Σ depuis liaison</span>
            </div>

            {/* Dernière séance */}
            <div className={styles.kpi}>
              <div className={styles["kpi-head"]}>
                <span className={styles["kpi-l"]}>Dernière séance</span>
                <span className={`${styles["kpi-badge"]} ${styles.flat}`}>
                  {stats.lastModule ? moduleLabel(stats.lastModule) : "—"}
                </span>
              </div>
              <span
                className={`${styles["kpi-v"]} ${
                  stats.lastScore === null ? styles.empty : ""
                }`}
              >
                {stats.lastScore !== null ? stats.lastScore.toFixed(1) : "—"}
              </span>
              <span className={styles["kpi-sub"]}>
                {stats.lastDate
                  ? `${
                      stats.lastScore === null
                        ? "Non scorée"
                        : moduleLabel(stats.lastModule)
                    } · ${fmtDot(stats.lastDate)}`
                  : "Aucune séance"}
              </span>
            </div>

            {/* Meilleur score */}
            <div className={styles.kpi}>
              <div className={styles["kpi-head"]}>
                <span className={styles["kpi-l"]}>Meilleur score</span>
                {stats.bestModule && (
                  <span
                    className={`${styles["kpi-badge"]} ${
                      styles[moduleBadgeClass(stats.bestModule)]
                    }`}
                  >
                    {moduleLabel(stats.bestModule)}
                  </span>
                )}
              </div>
              <span
                className={`${styles["kpi-v"]} ${
                  stats.bestScore !== null ? styles.hl : styles.empty
                }`}
              >
                {stats.bestScore !== null ? stats.bestScore.toFixed(1) : "—"}
              </span>
              <span className={styles["kpi-sub"]}>
                {stats.bestDate ? `PR · ${fmtDot(stats.bestDate, true)}` : "—"}
              </span>
            </div>

            {/* Précision (dernière) */}
            <div className={styles.kpi}>
              <div className={styles["kpi-head"]}>
                <span className={styles["kpi-l"]}>Précision (dernière)</span>
                <span className={`${styles["kpi-badge"]} ${styles.flat}`}>—</span>
              </div>
              <span
                className={`${styles["kpi-v"]} ${
                  stats.lastAccuracy === null ? styles.empty : ""
                }`}
              >
                {stats.lastAccuracy !== null ? (
                  <>
                    {(stats.lastAccuracy * 100).toFixed(0)}
                    <span className={styles.unit}>%</span>
                  </>
                ) : (
                  "—"
                )}
              </span>
              <span className={styles["kpi-sub"]}>
                {stats.lastAccuracy !== null
                  ? "Dernière séance"
                  : "En attente de scoring"}
              </span>
            </div>
          </div>

          {/* SECTION 01 — PROGRESSION */}
          <div className={styles["section-head"]}>
            <h2>
              <span className={styles.num}>01</span> Progression{" "}
              <em>longitudinale.</em>
            </h2>
            <div className={styles.meta}>
              {stats.count} sessions
              {chart.firstDate && chart.lastDate && (
                <>
                  {" · "}
                  <strong>
                    {fmtDM(chart.firstDate)} → {fmtDM(chart.lastDate)}
                  </strong>
                </>
              )}
            </div>
          </div>
          {chart.n === 0 ? (
            <div
              className={styles.panel}
              style={{ marginBottom: 32, padding: 24 }}
            >
              <EmptyState>Aucune séance scorée à tracer</EmptyState>
            </div>
          ) : (
            <div className={`${styles.panel} ${styles["main-chart"]}`}>
              <svg
                className={styles["main-chart-svg"]}
                viewBox="0 0 1100 340"
                preserveAspectRatio="none"
              >
                <defs>
                  {chart.areaColor && (
                    <linearGradient
                      id="ficheAreaGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={chart.areaColor}
                        stopOpacity="0.22"
                      />
                      <stop
                        offset="100%"
                        stopColor={chart.areaColor}
                        stopOpacity="0"
                      />
                    </linearGradient>
                  )}
                </defs>
                <g stroke="rgba(235,229,210,0.06)" strokeWidth="1">
                  <line x1="60" y1="40" x2="1080" y2="40" />
                  <line x1="60" y1="100" x2="1080" y2="100" />
                  <line x1="60" y1="160" x2="1080" y2="160" />
                  <line x1="60" y1="220" x2="1080" y2="220" />
                  <line x1="60" y1="280" x2="1080" y2="280" />
                </g>
                <g
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    fill: "rgba(235,229,210,0.32)",
                    letterSpacing: "0.1em",
                  }}
                >
                  <text x="46" y="44" textAnchor="end">100</text>
                  <text x="46" y="104" textAnchor="end">75</text>
                  <text x="46" y="164" textAnchor="end">50</text>
                  <text x="46" y="224" textAnchor="end">25</text>
                  <text x="46" y="284" textAnchor="end">0</text>
                </g>
                {chart.area && (
                  <path d={chart.area} fill="url(#ficheAreaGrad)" stroke="none" />
                )}
                {chart.trend && (
                  <line
                    x1={chart.trend.x1}
                    y1={chart.trend.y1}
                    x2={chart.trend.x2}
                    y2={chart.trend.y2}
                    stroke="rgba(232,74,58,0.55)"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                )}
                {chart.series.map((s) => (
                  <polyline
                    key={s.module}
                    points={s.polyline}
                    stroke={s.color}
                    strokeWidth="2.2"
                    fill="none"
                  />
                ))}
                {chart.pts.map((p, i) => {
                  const isPr = i === chart.prIndex;
                  return (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={isPr ? 7 : 5}
                      fill={isPr ? "#5ad99b" : p.color}
                    />
                  );
                })}
                {chart.callout && chart.pr && (
                  <g>
                    <rect
                      x={chart.callout.boxX}
                      y={chart.callout.boxY}
                      width={chart.callout.boxW}
                      height={chart.callout.boxH}
                      fill="var(--bg)"
                      stroke={chart.pr.color}
                      strokeWidth="1"
                    />
                    <text
                      x={chart.callout.boxX + 12}
                      y={chart.callout.boxY + 17}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 9,
                        fill: "rgba(235,229,210,0.55)",
                        letterSpacing: "0.12em",
                      }}
                    >
                      {moduleShort(chart.pr.module)} · PR
                    </text>
                    <text
                      x={chart.callout.boxX + 12}
                      y={chart.callout.boxY + 32}
                      style={{
                        fontFamily: "var(--display)",
                        fontWeight: 500,
                        fontSize: 17,
                        fill: "var(--ink)",
                      }}
                    >
                      {chart.pr.score.toFixed(1)}
                    </text>
                    {chart.delta !== null && (
                      <text
                        x={chart.callout.boxX + 56}
                        y={chart.callout.boxY + 32}
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 9,
                          fill: "#5ad99b",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {chart.delta >= 0
                          ? `↗+${chart.delta}`
                          : `↘${chart.delta}`}
                      </text>
                    )}
                  </g>
                )}
                <g
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    fill: "rgba(235,229,210,0.32)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {chart.pts.map((p, i) =>
                    chart.n <= 7 ||
                    i === 0 ||
                    i === chart.n - 1 ||
                    i % chart.labelStep === 0 ? (
                      <text
                        key={i}
                        x={p.x}
                        y="312"
                        textAnchor={
                          i === 0
                            ? "start"
                            : i === chart.n - 1
                              ? "end"
                              : "middle"
                        }
                      >
                        {fmtSlash(p.date)}
                      </text>
                    ) : null
                  )}
                </g>
              </svg>
              <div className={styles["chart-legend"]}>
                {chart.modulesPresent.map((m) => (
                  <div className={styles.item} key={m}>
                    <span
                      className={styles.sw}
                      style={{ background: modChartColor(m) }}
                    />{" "}
                    {m === "autre" ? "Autre" : moduleLabel(m)}
                  </div>
                ))}
                <div className={styles.item}>
                  <span
                    className={styles.ln}
                    style={{ background: "var(--red)" }}
                  />{" "}
                  Tendance
                </div>
                {chart.delta !== null && (
                  <span className={styles.delta}>
                    {chart.delta >= 0 ? `↗ +${chart.delta}` : `↘ ${chart.delta}`}{" "}
                    pts sur {chart.n} séances
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SECTION 02 — RÉPARTITION & HISTORIQUE */}
          <div className={styles["section-head"]}>
            <h2>
              <span className={styles.num}>02</span> Répartition &amp;{" "}
              <em>historique.</em>
            </h2>
            <div className={styles.meta}>
              Volume par module · <strong>{stats.count} séances</strong>
            </div>
          </div>
          {sessions.length === 0 ? (
            <div
              className={styles.panel}
              style={{ marginBottom: 32, padding: 24 }}
            >
              <EmptyState>Aucune séance enregistrée</EmptyState>
            </div>
          ) : (
            <div className={styles["grid-2"]}>
              {/* Dernières séances */}
              <div className={styles.panel}>
                <div className={styles["panel-head"]}>
                  <span className={styles.title}>Dernières séances</span>
                  <span>{sessions.length} entrées</span>
                </div>
                <div className={styles["st-head"]}>
                  <span>Date</span>
                  <span>Séance</span>
                  <span className={styles["col-hide"]}>Module</span>
                  <span className={styles["col-hide"]}>Coups</span>
                  <span className={styles["col-hide"]}>Précision</span>
                  <span style={{ textAlign: "right" }}>Score</span>
                </div>
                {sessions.map((s) => {
                  const linkable =
                    s.source === "module" && !!s.module_session_id;
                  const isPr =
                    stats.bestScore !== null &&
                    s.normalized_score === stats.bestScore;
                  return (
                    <div
                      key={s.id}
                      onClick={
                        linkable
                          ? () => openLinkedSession(s.module_session_id!)
                          : undefined
                      }
                      onKeyDown={
                        linkable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openLinkedSession(s.module_session_id!);
                              }
                            }
                          : undefined
                      }
                      role={linkable ? "button" : undefined}
                      tabIndex={linkable ? 0 : undefined}
                      className={`${styles["st-row"]} ${
                        linkable ? styles["row-link"] : ""
                      }`}
                    >
                      <span className={styles.date}>{fmtSlash(s.date)}</span>
                      <span className={styles.nm}>
                        {s.notes?.trim() || moduleLabel(s.module)}
                        {linkable && (
                          <span
                            style={{ color: "var(--red)", marginLeft: 6 }}
                            aria-hidden
                          >
                            ▸
                          </span>
                        )}
                        <span className={styles.s}>
                          {s.source === "module"
                            ? "Séance app"
                            : "Carnet manuel"}
                        </span>
                      </span>
                      <span
                        className={`${styles["st-mod"]} ${
                          styles[moduleBadgeClass(s.module)]
                        }`}
                      >
                        {moduleLabel(s.module)}
                      </span>
                      <span className={styles.num}>{s.total_shots ?? "—"}</span>
                      <span className={`${styles.num} ${styles.acc}`}>
                        {typeof s.accuracy === "number"
                          ? `${(s.accuracy * 100).toFixed(0)}%`
                          : "—"}
                      </span>
                      <span
                        className={`${styles.score} ${isPr ? styles.hl : ""}`}
                        style={
                          s.normalized_score === null
                            ? { color: "var(--dim-2)" }
                            : undefined
                        }
                      >
                        {typeof s.normalized_score === "number"
                          ? s.normalized_score.toFixed(1)
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Répartition par module */}
              <div className={styles.panel}>
                <div className={styles["panel-head"]}>
                  <span className={styles.title}>Répartition par module</span>
                  <span>Σ {volume.total} coups</span>
                </div>
                <div className={styles["mod-wrap"]}>
                  {volume.rows.map((r) => (
                    <div className={styles["mod-row"]} key={r.module}>
                      <span className={styles.lbl}>
                        <span
                          className={styles.dot}
                          style={{ background: modChartColor(r.module) }}
                        />
                        {r.module === "autre" ? "Autre" : moduleLabel(r.module)}
                      </span>
                      <div className={styles["mod-track"]}>
                        <div
                          className={styles.fill}
                          style={{
                            width: `${
                              volume.max > 0 ? (r.shots / volume.max) * 100 : 0
                            }%`,
                            background: modChartColor(r.module),
                          }}
                        />
                      </div>
                      <span className={styles.v}>
                        {r.shots}
                        <span className={styles.u}>c</span>
                      </span>
                    </div>
                  ))}
                  {(volume.dominant || volume.hasDry) && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 18,
                        borderTop: "1px solid var(--line)",
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--dim)",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      {volume.dominant ? (
                        <span>
                          Dominante{" "}
                          <strong
                            style={{ color: modChartColor(volume.dominant) }}
                          >
                            {moduleLabel(volume.dominant)}
                          </strong>
                        </span>
                      ) : (
                        <span />
                      )}
                      {volume.hasDry && (
                        <span>
                          Dry fire{" "}
                          <strong style={{ color: "var(--ink)" }}>
                            non scoré
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 03 — ASSIGNATIONS */}
          <div className={styles["section-head"]}>
            <h2>
              <span className={styles.num}>03</span> <em>Assignations.</em>
            </h2>
            <div className={styles.meta}>
              {assignments.filter((a) => a.status === "completed").length}/
              {assignments.length} complétées
            </div>
          </div>

          <div className={styles["action-bar"]}>
            <Link
              href={`/dashboard/shooter/session/new/?id=${shooter.id}`}
              className={styles["btn-red"]}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              Créer une séance
            </Link>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={styles["btn-ghost"]}
            >
              + Assignation rapide
            </button>
          </div>

          {assignments.length === 0 ? (
            <div
              className={styles.panel}
              style={{ marginBottom: 32, padding: 24 }}
            >
              <EmptyState>Aucune assignation</EmptyState>
            </div>
          ) : (
            <div className={styles.panel} style={{ marginBottom: 32 }}>
              <div className={styles["as-head"]}>
                <span>Titre</span>
                <span className={styles["col-hide"]}>Type</span>
                <span className={styles["col-hide"]}>Module</span>
                <span className={styles["col-hide"]}>Deadline</span>
                <span>Statut</span>
                <span style={{ textAlign: "right" }}>Actions</span>
              </div>
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className={`${styles["as-row"]} ${
                    a.status === "overdue" ? styles.overdue : ""
                  }`}
                >
                  <span className={styles.at}>
                    {a.title}
                    {a.description && (
                      <span className={styles.s}>{a.description}</span>
                    )}
                  </span>
                  <span className={`${styles.ty} ${styles["col-hide"]}`}>
                    {a.type}
                  </span>
                  <span className={styles["col-hide"]}>
                    {a.module_kind ? (
                      <span
                        className={`${styles["st-mod"]} ${
                          styles[moduleBadgeClass(a.module_kind)]
                        }`}
                      >
                        {moduleLabel(a.module_kind)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--dim-2)" }}>—</span>
                    )}
                  </span>
                  <span className={`${styles.dl} ${styles["col-hide"]}`}>
                    {formatDate(a.deadline)}
                  </span>
                  <span>
                    <AssignmentStatusBadge status={a.status} />
                  </span>
                  <span className={styles["as-actions"]}>
                    {a.content && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadSessionPdf({
                            title: a.title,
                            type: a.type,
                            module_kind: a.module_kind,
                            deadline: a.deadline,
                            shooter_name: shooter.name,
                            instructor_name: instructorName || "—",
                            content: a.content!,
                          })
                        }
                        className={styles["btn-mini"]}
                        aria-label={`Télécharger la fiche PDF — ${a.title}`}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        PDF
                      </button>
                    )}
                    {a.status === "completed" && a.module_session_id && (
                      <button
                        type="button"
                        onClick={() => openLinkedSession(a.module_session_id!)}
                        className={styles["btn-mini"]}
                        aria-label={`Ouvrir la séance liée — ${a.title}`}
                      >
                        Séance ▸
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          <NewAssignmentModal
            shooterId={shooter.id}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onCreated={() => load()}
          />

          <LinkedSessionModal
            open={linkedLoading || linkedSession !== null}
            loading={linkedLoading}
            session={linkedSession}
            feedback={linkedFeedback}
            onClose={() => {
              setLinkedSession(null);
              setLinkedFeedback(null);
            }}
          />
        </>
      )}
    </div>
  );
}

function LinkedSessionModal({
  open,
  loading,
  session,
  feedback,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  session: ModuleSessionRow | null;
  feedback: SessionFeedbackRow | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto border border-[#1A1A1A] bg-[#0A0A0A]">
        <div className="flex items-center justify-between border-b border-[#1A1A1A] px-6 py-4">
          <h3 className="font-mono text-base font-bold uppercase tracking-[0.18em] text-white">
            Séance liée
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#888] transition-colors hover:text-white"
          >
            Fermer
          </button>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#888]">
              Chargement…
            </p>
          ) : !session ? (
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#E84040]">
              Séance introuvable
            </p>
          ) : (
            <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <SessionField label="Date" value={formatDate(session.date)} />
              <SessionField
                label="Module"
                value={moduleLabel(session.source_module)}
              />
              <SessionField
                label="Score"
                value={
                  typeof session.normalized_score === "number"
                    ? session.normalized_score.toFixed(1)
                    : "—"
                }
              />
              <SessionField
                label="Hit Factor"
                value={
                  typeof session.hit_factor === "number"
                    ? session.hit_factor.toFixed(2)
                    : "—"
                }
              />
              <SessionField
                label="Coups"
                value={session.total_shots != null ? String(session.total_shots) : "—"}
              />
              <SessionField
                label="Précision"
                value={
                  typeof session.accuracy === "number"
                    ? `${(session.accuracy * 100).toFixed(0)}%`
                    : "—"
                }
              />
            </dl>
            {feedback && <FeedbackBlock feedback={feedback} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#666]">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm tabular-nums text-white">{value}</dd>
    </div>
  );
}

function FeedbackBlock({ feedback }: { feedback: SessionFeedbackRow }) {
  const answers = Array.isArray(feedback.answers) ? feedback.answers : [];
  const hasDifficulty = typeof feedback.difficulty === "number";
  const hasEnjoyment = typeof feedback.enjoyment === "number"; // null en dry fire
  const hasText = !!feedback.free_text && feedback.free_text.trim().length > 0;

  // Feedback existant mais entièrement vide → ne rien afficher.
  if (!hasDifficulty && !hasEnjoyment && !hasText && answers.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-[#1A1A1A] pt-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7A0000]">
        Feedback tireur
      </p>

      {(hasDifficulty || hasEnjoyment) && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {hasDifficulty && (
            <SessionField label="Difficulté" value={`${feedback.difficulty}/10`} />
          )}
          {hasEnjoyment && (
            <SessionField label="Ressenti" value={`${feedback.enjoyment}/10`} />
          )}
        </dl>
      )}

      {hasText && (
        <div className="mt-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#666]">
            Commentaire
          </p>
          <p className="mt-1.5 whitespace-pre-line font-mono text-sm leading-relaxed text-[#aaa]">
            {feedback.free_text}
          </p>
        </div>
      )}

      {answers.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#666]">
            Auto-évaluation
          </p>
          <ul className="mt-2 space-y-2">
            {answers.map((a, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-3 border-b border-[#111] pb-2 last:border-b-0"
              >
                <span className="font-mono text-[11px] leading-snug text-[#aaa]">
                  {a.question}
                </span>
                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-white">
                  {typeof a.rating === "number" ? `${a.rating}/5` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#888] ${className}`}
    >
      {children}
    </th>
  );
}
