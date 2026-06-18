"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchAssignments,
  fetchShooters,
  fetchUnifiedSessions,
  joinShooterStats,
} from "@/components/dashboard/data";
import {
  EmptyState,
  TrendArrow,
} from "@/components/dashboard/ui";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import styles from "@/components/dashboard/dashboard.module.css";
import type {
  ManualSession,
  ShooterWithStats,
} from "@/components/dashboard/types";

// Tokens charte dupliqués pour recharts : var(--...) ne se résout pas
// dans les attributs SVG (stroke/fill). À garder synchronisés avec
// dashboard.module.css.
const CHART = {
  line: "rgba(235,229,210,0.08)", // matches --line
  dim: "rgba(235,229,210,0.55)", // matches --dim
  bg: "#0a0a0c", // matches --bg
  ink: "#ebe5d2", // matches --ink
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

const PALETTE = [
  "#FFB300",
  "#4D8AFF",
  "#B94DFF",
  "#FF6B00",
  "#00E5FF",
  "#FFD600",
  "#00FF44",
  "#E84040",
  "#9A0000",
  "#888888",
];

export default function AnalyticsPage() {
  const [shooters, setShooters] = useState<ShooterWithStats[]>([]);
  const [allSessions, setAllSessions] = useState<ManualSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchShooters();
        const ids = list.map((s) => s.id);
        const [ss, aa] = await Promise.all([
          fetchUnifiedSessions(list),
          fetchAssignments(ids),
        ]);
        if (cancelled) return;
        const enriched = joinShooterStats(list, ss, aa);
        setShooters(enriched);
        setAllSessions(ss);
        setVisibleIds(new Set(enriched.slice(0, 5).map((x) => x.id)));
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const colorForId = useMemo(() => {
    const m = new Map<string, string>();
    shooters.forEach((s, i) => m.set(s.id, PALETTE[i % PALETTE.length]));
    return m;
  }, [shooters]);

  const lineChartData = useMemo(() => {
    // Merge: one record per date across visible shooters
    const dateMap = new Map<number, Record<string, number | string>>();
    shooters.forEach((s) => {
      if (!visibleIds.has(s.id)) return;
      s.sessions.forEach((ss) => {
        if (typeof ss.normalized_score !== "number") return;
        const t = +new Date(ss.date);
        const row = dateMap.get(t) ?? { t };
        row[s.id] = ss.normalized_score;
        dateMap.set(t, row);
      });
    });
    return Array.from(dateMap.values()).sort(
      (a, b) => (a.t as number) - (b.t as number)
    );
  }, [shooters, visibleIds]);

  const ranking = useMemo(() => {
    return [...shooters]
      .filter((s) => s.avgScore !== null)
      .sort((a, b) => (b.avgScore as number) - (a.avgScore as number));
  }, [shooters]);

  function toggleShooter(id: string) {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className={styles.page}
      style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 40px 80px" }}
    >
      <div className={styles["page-head"]}>
        <div>
          <div className={styles.eyebrow}>Module · Analytics</div>
          <h1 className={styles.title}>
            Comparatif<em>.</em>
          </h1>
        </div>
        <div className={styles["head-meta"]}>
          <div className={styles.stat}>
            <span>Tireurs</span>
            <strong>{String(shooters.length).padStart(2, "0")}</strong>
          </div>
          <div className={styles.stat}>
            <span>Sessions</span>
            <strong>{String(allSessions.length).padStart(2, "0")}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            margin: "0 0 24px",
            border: "1px solid var(--red)",
            background: "var(--red-soft)",
            color: "var(--red)",
            padding: "12px 16px",
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          {error}
        </div>
      )}

      {/* PROGRESSION MULTI */}
      <div style={{ marginBottom: 40 }}>
        <div className={styles["section-head"]}>
          <h2>
            <span className={styles.num}>01</span> Progression multi-tireurs
          </h2>
        </div>
        {loading ? (
          <EmptyState>Chargement…</EmptyState>
        ) : shooters.length === 0 ? (
          <EmptyState>Aucun tireur</EmptyState>
        ) : (
          <div className={styles.panel} style={{ padding: 16 }}>
            <div
              style={{
                marginBottom: 16,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {shooters.map((s) => {
                const on = visibleIds.has(s.id);
                const color = colorForId.get(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleShooter(s.id)}
                    className={styles["btn-mini"]}
                    style={
                      on
                        ? { borderColor: "var(--red)", color: "var(--red)" }
                        : undefined
                    }
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        flexShrink: 0,
                        background: on ? color : "var(--dim-2)",
                      }}
                    />
                    {s.name}
                  </button>
                );
              })}
            </div>

            {lineChartData.length === 0 ? (
              <EmptyState>Sélectionnez au moins un tireur</EmptyState>
            ) : (
              <div style={{ width: "100%", height: 360 }}>
                <ResponsiveContainer>
                  <LineChart data={lineChartData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke={CHART.line} />
                    <XAxis
                      type="number"
                      dataKey="t"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tick={{ fill: CHART.dim, fontFamily: CHART.mono, fontSize: 11, letterSpacing: "0.1em" }}
                      tickFormatter={(t) =>
                        new Date(Number(t)).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
                      }
                      stroke={CHART.dim}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: CHART.dim, fontFamily: CHART.mono, fontSize: 11, letterSpacing: "0.1em" }}
                      stroke={CHART.dim}
                      width={32}
                    />
                    <Tooltip
                      contentStyle={{
                        background: CHART.bg,
                        border: `1px solid ${CHART.line}`,
                        borderRadius: 0,
                        fontFamily: CHART.mono,
                        fontSize: 12,
                        color: CHART.ink,
                      }}
                      labelStyle={{ color: CHART.ink, textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 10 }}
                      labelFormatter={(label) =>
                        new Date(Number(label)).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
                      }
                      formatter={(value, name) => {
                        const s = shooters.find((x) => x.id === name);
                        return [Number(value).toFixed(1), s?.name ?? String(name)];
                      }}
                    />
                    {shooters
                      .filter((s) => visibleIds.has(s.id))
                      .map((s) => (
                        <Line
                          key={s.id}
                          type="monotone"
                          dataKey={s.id}
                          name={s.id}
                          stroke={colorForId.get(s.id)}
                          strokeWidth={2}
                          dot={{ r: 3, stroke: CHART.bg, strokeWidth: 1 }}
                          activeDot={{ r: 4, stroke: CHART.bg, strokeWidth: 1 }}
                          isAnimationActive={false}
                          connectNulls
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* HEATMAP */}
      <div style={{ marginBottom: 40 }}>
        <div className={styles["section-head"]}>
          <h2>
            <span className={styles.num}>02</span> Activité — 30 derniers jours
          </h2>
        </div>
        {loading ? (
          <EmptyState>Chargement…</EmptyState>
        ) : (
          <div className={styles.panel} style={{ padding: 24 }}>
            <ActivityHeatmap sessions={allSessions} days={30} />
          </div>
        )}
      </div>

      {/* RANKING */}
      <div style={{ marginBottom: 40 }}>
        <div className={styles["section-head"]}>
          <h2>
            <span className={styles.num}>03</span> Classement
          </h2>
        </div>
        {loading ? (
          <EmptyState>Chargement…</EmptyState>
        ) : ranking.length === 0 ? (
          <EmptyState>Aucune donnée à classer</EmptyState>
        ) : (
          <div className={styles.panel} style={{ overflowX: "auto" }}>
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-[#1A1A1A] text-left">
                  <Th className="w-16 text-center">Rang</Th>
                  <Th>Tireur</Th>
                  <Th className="text-right">Score moyen</Th>
                  <Th className="text-center">Tendance</Th>
                  <Th className="text-right">Sessions</Th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((s, i) => {
                  const rank = i + 1;
                  const top3 = rank <= 3;
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-[#111] ${top3 ? "bg-[#7A0000]/[0.06]" : ""}`}
                    >
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center border font-mono text-sm font-bold tabular-nums ${
                            top3
                              ? "border-[#7A0000] bg-[#7A0000] text-white"
                              : "border-[#1A1A1A] text-[#666]"
                          }`}
                        >
                          {rank}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-white">{s.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-white">
                        {(s.avgScore as number).toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <TrendArrow trend={s.trend} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-[#aaa]">
                        {s.sessions.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
