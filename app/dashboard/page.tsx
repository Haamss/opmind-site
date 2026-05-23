"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchShooters,
  fetchSessions,
  fetchAssignments,
  formatDate,
  isPro,
  joinShooterStats,
} from "@/components/dashboard/data";
import { moduleLabel } from "@/components/dashboard/modules";
import {
  AssignmentTriad,
  Card,
  EmptyState,
  KpiTile,
  ProfileBadge,
  SectionTitle,
  ShooterStatusBadge,
  TrendArrow,
} from "@/components/dashboard/ui";
import type { ShooterWithStats } from "@/components/dashboard/types";

type ProfileFilter = "all" | "pro" | "civil";
type StatusFilter = "all" | "active" | "pending";

type SortKey =
  | "name"
  | "status"
  | "unit"
  | "lastDate"
  | "lastScore"
  | "trend"
  | "assignments";
type SortDir = "asc" | "desc";

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shooters, setShooters] = useState<ShooterWithStats[]>([]);

  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchShooters();
        const ids = list.map((s) => s.id);
        const [sessions, assignments] = await Promise.all([
          fetchSessions(ids),
          fetchAssignments(ids),
        ]);
        if (cancelled) return;
        setShooters(joinShooterStats(list, sessions, assignments));
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

  const kpis = useMemo(() => {
    const activeCount = shooters.filter((s) => s.status === "active").length;
    const pendingCount = shooters.filter((s) => s.status === "pending").length;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const sessionsThisMonth = shooters.reduce(
      (n, s) =>
        n +
        s.sessions.filter((x) => new Date(x.date) >= startOfMonth).length,
      0
    );

    const allScores = shooters
      .flatMap((s) => s.sessions.map((x) => x.normalized_score))
      .filter((v): v is number => typeof v === "number");
    const avgScore =
      allScores.length > 0
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length
        : null;

    const overdueCount = shooters.reduce((n, s) => n + s.overdueCount, 0);

    return { activeCount, pendingCount, sessionsThisMonth, avgScore, overdueCount };
  }, [shooters]);

  const filtered = useMemo(() => {
    const list = shooters.filter((s) => {
      if (profileFilter === "pro" && !isPro(s)) return false;
      if (profileFilter === "civil" && isPro(s)) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });

    const cmp = (a: ShooterWithStats, b: ShooterWithStats): number => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          return a.status.localeCompare(b.status);
        case "unit":
          return (a.unit ?? a.specialite ?? "").localeCompare(
            b.unit ?? b.specialite ?? ""
          );
        case "lastDate": {
          const da = a.lastSession ? +new Date(a.lastSession.date) : 0;
          const db = b.lastSession ? +new Date(b.lastSession.date) : 0;
          return da - db;
        }
        case "lastScore":
          return (
            (a.lastSession?.normalized_score ?? -1) -
            (b.lastSession?.normalized_score ?? -1)
          );
        case "trend": {
          const v = (t: typeof a.trend) =>
            t === "up" ? 2 : t === "flat" ? 1 : t === "down" ? 0 : -1;
          return v(a.trend) - v(b.trend);
        }
        case "assignments":
          return a.overdueCount - b.overdueCount;
      }
    };

    list.sort((a, b) => (sortDir === "asc" ? cmp(a, b) : -cmp(a, b)));
    return list;
  }, [shooters, profileFilter, statusFilter, sortKey, sortDir]);

  const chartData = useMemo(() => {
    return [...shooters]
      .filter((s) => s.avgScore !== null)
      .map((s) => ({
        name: s.name,
        score: Math.round((s.avgScore as number) * 10) / 10,
        pro: isPro(s),
      }))
      .sort((a, b) => b.score - a.score);
  }, [shooters]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function goShooter(id: string) {
    router.push(`/dashboard/shooter/?id=${id}`);
  }

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7A0000]">
          Dashboard Instructeur
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
          Vue d&apos;ensemble
        </h1>
      </div>

      {error && (
        <div className="mb-6 border border-[#E84040]/50 bg-[#E84040]/[0.08] px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-[#E84040]">
          {error}
        </div>
      )}

      <div className="mb-10 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          label="Tireurs actifs"
          value={loading ? "…" : kpis.activeCount}
        />
        <KpiTile
          label="En attente"
          value={loading ? "…" : kpis.pendingCount}
        />
        <KpiTile
          label="Sessions ce mois"
          value={loading ? "…" : kpis.sessionsThisMonth}
        />
        <KpiTile
          label="Score moyen global"
          value={
            loading
              ? "…"
              : kpis.avgScore !== null
                ? kpis.avgScore.toFixed(1)
                : "—"
          }
          hint="0 — 100"
        />
        <KpiTile
          label="Assignations en retard"
          value={loading ? "…" : kpis.overdueCount}
          danger={kpis.overdueCount > 0}
        />
      </div>

      <SectionTitle eyebrow="01" title="Effectif" />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterGroup
          label="Profil"
          options={[
            { v: "all", l: "Tous" },
            { v: "pro", l: "Pro" },
            { v: "civil", l: "Civil" },
          ]}
          value={profileFilter}
          onChange={(v) => setProfileFilter(v as ProfileFilter)}
        />
        <FilterGroup
          label="Statut"
          options={[
            { v: "all", l: "Tous" },
            { v: "active", l: "Actif" },
            { v: "pending", l: "En attente" },
          ]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />
      </div>

      {loading ? (
        <EmptyState>Chargement…</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>Aucun tireur — ajustez les filtres</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse">
            <thead>
              <tr className="border-b border-[#1A1A1A] text-left">
                <Th onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir}>Nom</Th>
                <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>Statut</Th>
                <Th onClick={() => toggleSort("unit")} active={sortKey === "unit"} dir={sortDir}>Unité / Spécialité</Th>
                <Th onClick={() => toggleSort("lastDate")} active={sortKey === "lastDate"} dir={sortDir}>Dernière session</Th>
                <Th onClick={() => toggleSort("lastScore")} active={sortKey === "lastScore"} dir={sortDir} className="text-right">Score</Th>
                <Th onClick={() => toggleSort("trend")} active={sortKey === "trend"} dir={sortDir} className="text-center">Tendance</Th>
                <Th onClick={() => toggleSort("assignments")} active={sortKey === "assignments"} dir={sortDir}>Assignations</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => goShooter(s.id)}
                  className="cursor-pointer border-b border-[#111] transition-colors hover:bg-[#111]"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <ProfileBadge pro={isPro(s)} />
                      <div>
                        <p className="font-mono text-sm font-semibold text-white">{s.name}</p>
                        {s.grade && (
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#666]">{s.grade}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><ShooterStatusBadge status={s.status} /></td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#aaa]">
                    {s.unit || s.specialite || <span className="text-[#444]">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    {s.lastSession ? (
                      <div>
                        <p className="font-mono text-xs text-[#aaa]">{formatDate(s.lastSession.date)}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#666]">{moduleLabel(s.lastSession.module)}</p>
                      </div>
                    ) : (
                      <span className="text-[#444]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm tabular-nums font-semibold text-white">
                    {s.lastSession?.normalized_score !== null && s.lastSession?.normalized_score !== undefined
                      ? s.lastSession.normalized_score.toFixed(1)
                      : <span className="text-[#444]">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center"><TrendArrow trend={s.trend} /></td>
                  <td className="px-4 py-3.5">
                    <AssignmentTriad done={s.doneCount} pending={s.pendingCount} overdue={s.overdueCount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="mt-10">
        <SectionTitle eyebrow="02" title="Comparatif — score moyen" />
        {chartData.length === 0 ? (
          <EmptyState>Aucune donnée à afficher</EmptyState>
        ) : (
          <Card className="p-4">
            <div style={{ width: "100%", height: Math.max(180, chartData.length * 36 + 60) }}>
              <ResponsiveContainer>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 8, right: 56, left: 160, bottom: 8 }}
                >
                  <CartesianGrid stroke="#1A1A1A" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "#888", fontFamily: "var(--font-mono)", fontSize: 11 }}
                    stroke="#1A1A1A"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={0}
                    tick={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#111" }}
                    contentStyle={{
                      background: "#0A0A0A",
                      border: "1px solid #1A1A1A",
                      borderRadius: 0,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "#fff",
                    }}
                    labelStyle={{ color: "#fff", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 10 }}
                    formatter={(v) => [Number(v).toFixed(1), "Score"]}
                  />
                  <Bar dataKey="score" isAnimationActive={false}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.pro ? "#7A0000" : "#888888"} />
                    ))}
                    <LabelList
                      dataKey="name"
                      position="left"
                      offset={12}
                      style={{
                        fill: "#FFFFFF",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    />
                    <LabelList
                      dataKey="score"
                      position="right"
                      offset={8}
                      formatter={(v) => Number(v).toFixed(1)}
                      style={{
                        fill: "#FFFFFF",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: SortDir;
  className?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer select-none px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#888] transition-colors hover:text-white ${
        active ? "text-white" : ""
      } ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {active && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            {dir === "asc" ? <path d="M6 15L12 9L18 15" /> : <path d="M6 9L12 15L18 9" />}
          </svg>
        )}
      </span>
    </th>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-stretch border border-[#1A1A1A] bg-[#0A0A0A]">
      <span className="border-r border-[#1A1A1A] px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[#666]">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`border-r border-[#1A1A1A] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors last:border-r-0 ${
            value === o.v
              ? "bg-[#7A0000] text-white"
              : "text-[#888] hover:bg-[#111] hover:text-white"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
