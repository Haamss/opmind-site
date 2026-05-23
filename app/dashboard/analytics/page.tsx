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
  fetchSessions,
  fetchShooters,
  joinShooterStats,
} from "@/components/dashboard/data";
import {
  Card,
  EmptyState,
  SectionTitle,
  TrendArrow,
} from "@/components/dashboard/ui";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import type {
  ManualSession,
  ShooterWithStats,
} from "@/components/dashboard/types";

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
          fetchSessions(ids),
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
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7A0000]">
          Analytics
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
          Comparatif
        </h1>
      </div>

      {error && (
        <div className="mb-6 border border-[#E84040]/50 bg-[#E84040]/[0.08] px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-[#E84040]">
          {error}
        </div>
      )}

      {/* PROGRESSION MULTI */}
      <div className="mb-10">
        <SectionTitle eyebrow="01" title="Progression multi-tireurs" />
        {loading ? (
          <EmptyState>Chargement…</EmptyState>
        ) : shooters.length === 0 ? (
          <EmptyState>Aucun tireur</EmptyState>
        ) : (
          <Card className="p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {shooters.map((s) => {
                const on = visibleIds.has(s.id);
                const color = colorForId.get(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleShooter(s.id)}
                    className={`flex items-center gap-2 border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                      on
                        ? "border-[#333] bg-[#111] text-white"
                        : "border-[#1A1A1A] text-[#555] hover:border-[#333]"
                    }`}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5"
                      style={{ background: on ? color : "#333" }}
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
                    <CartesianGrid stroke="#1A1A1A" />
                    <XAxis
                      type="number"
                      dataKey="t"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tick={{ fill: "#888", fontFamily: "var(--font-mono)", fontSize: 11 }}
                      tickFormatter={(t) =>
                        new Date(Number(t)).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
                      }
                      stroke="#1A1A1A"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#888", fontFamily: "var(--font-mono)", fontSize: 11 }}
                      stroke="#1A1A1A"
                      width={32}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0A0A0A",
                        border: "1px solid #1A1A1A",
                        borderRadius: 0,
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "#fff",
                      }}
                      labelStyle={{ color: "#fff", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 10 }}
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
                          dot={{ r: 3, stroke: "#000", strokeWidth: 1 }}
                          isAnimationActive={false}
                          connectNulls
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* HEATMAP */}
      <div className="mb-10">
        <SectionTitle eyebrow="02" title="Activité — 30 derniers jours" />
        {loading ? (
          <EmptyState>Chargement…</EmptyState>
        ) : (
          <Card className="p-6">
            <ActivityHeatmap sessions={allSessions} days={30} />
          </Card>
        )}
      </div>

      {/* RANKING */}
      <div className="mb-10">
        <SectionTitle eyebrow="03" title="Classement" />
        {loading ? (
          <EmptyState>Chargement…</EmptyState>
        ) : ranking.length === 0 ? (
          <EmptyState>Aucune donnée à classer</EmptyState>
        ) : (
          <Card className="overflow-x-auto">
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
          </Card>
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
