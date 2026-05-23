"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchAssignments,
  fetchShooters,
  formatDate,
} from "@/components/dashboard/data";
import { moduleColor, moduleLabel } from "@/components/dashboard/modules";
import {
  AssignmentStatusBadge,
  Card,
  EmptyState,
  KpiTile,
  SectionTitle,
} from "@/components/dashboard/ui";
import type {
  Assignment,
  AssignmentStatus,
  AssignmentType,
  Shooter,
} from "@/components/dashboard/types";

type PeriodFilter = "30" | "90" | "all";
type StatusFilter = "all" | AssignmentStatus;
type TypeFilter = "all" | AssignmentType;

export default function AssignmentsPage() {
  const [shooters, setShooters] = useState<Shooter[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shooterFilter, setShooterFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchShooters();
        const ids = list.map((s) => s.id);
        const aa = await fetchAssignments(ids);
        if (cancelled) return;
        setShooters(list);
        setAssignments(aa);
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

  const shootersById = useMemo(() => {
    const m = new Map<string, Shooter>();
    shooters.forEach((s) => m.set(s.id, s));
    return m;
  }, [shooters]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const periodMs =
      periodFilter === "30"
        ? 30 * 86400000
        : periodFilter === "90"
          ? 90 * 86400000
          : null;
    return assignments.filter((a) => {
      if (shooterFilter !== "all" && a.instructor_shooter_id !== shooterFilter)
        return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (periodMs !== null) {
        const t = +new Date(a.created_at);
        if (now - t > periodMs) return false;
      }
      return true;
    });
  }, [assignments, shooterFilter, statusFilter, typeFilter, periodFilter]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => a.status === "completed").length;
    const pending = assignments.filter((a) => a.status === "pending").length;
    const overdue = assignments.filter((a) => a.status === "overdue").length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, overdue, rate };
  }, [assignments]);

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7A0000]">
          Gestion
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
          Assignations
        </h1>
      </div>

      {error && (
        <div className="mb-6 border border-[#E84040]/50 bg-[#E84040]/[0.08] px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-[#E84040]">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <KpiTile label="Total" value={loading ? "…" : stats.total} />
        <KpiTile
          label="Complétées"
          value={loading ? "…" : stats.completed}
          hint={loading ? undefined : `${stats.rate}%`}
        />
        <KpiTile label="En cours" value={loading ? "…" : stats.pending} />
        <KpiTile
          label="En retard"
          value={loading ? "…" : stats.overdue}
          danger={stats.overdue > 0}
        />
      </div>

      <Card className="mb-10 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#888]">
            Taux de complétion
          </p>
          <p className="font-mono text-sm font-bold tabular-nums text-white">
            {loading ? "…" : `${stats.rate}%`}
          </p>
        </div>
        <div className="mt-3 h-2 w-full bg-[#1A1A1A]">
          <div
            className="h-full bg-[#7A0000] transition-all duration-500"
            style={{ width: `${stats.rate}%` }}
          />
        </div>
      </Card>

      <SectionTitle eyebrow="01" title="Filtres" />

      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          label="Tireur"
          value={shooterFilter}
          onChange={setShooterFilter}
          options={[
            { v: "all", l: "Tous" },
            ...shooters.map((s) => ({ v: s.id, l: s.name })),
          ]}
        />
        <FilterGroup
          label="Statut"
          options={[
            { v: "all", l: "Tous" },
            { v: "pending", l: "En cours" },
            { v: "completed", l: "Complétée" },
            { v: "overdue", l: "En retard" },
          ]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />
        <FilterGroup
          label="Type"
          options={[
            { v: "all", l: "Tous" },
            { v: "module", l: "Module" },
            { v: "carnet", l: "Carnet" },
            { v: "free", l: "Libre" },
          ]}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as TypeFilter)}
        />
        <FilterGroup
          label="Période"
          options={[
            { v: "all", l: "Tout" },
            { v: "90", l: "90j" },
            { v: "30", l: "30j" },
          ]}
          value={periodFilter}
          onChange={(v) => setPeriodFilter(v as PeriodFilter)}
        />
      </div>

      {loading ? (
        <EmptyState>Chargement…</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>Aucune assignation pour ces filtres</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse">
            <thead>
              <tr className="border-b border-[#1A1A1A] text-left">
                <Th>Tireur</Th>
                <Th>Titre</Th>
                <Th>Type</Th>
                <Th>Module</Th>
                <Th>Deadline</Th>
                <Th>Statut</Th>
                <Th>Créée le</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const shooter = shootersById.get(a.instructor_shooter_id);
                const overdue = a.status === "overdue";
                return (
                  <tr
                    key={a.id}
                    className={`border-b border-[#111] ${overdue ? "bg-[#E84040]/[0.05]" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-white">
                      {shooter?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm text-white">{a.title}</p>
                      {a.description && (
                        <p className="mt-1 max-w-md font-mono text-[11px] text-[#888]">
                          {a.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#aaa]">
                      {a.type}
                    </td>
                    <td className="px-4 py-3">
                      {a.module_kind ? (
                        <span className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                          <span
                            className="inline-block h-2 w-2"
                            style={{ background: moduleColor(a.module_kind) }}
                          />
                          {moduleLabel(a.module_kind)}
                        </span>
                      ) : (
                        <span className="text-[#444]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#aaa]">{formatDate(a.deadline)}</td>
                    <td className="px-4 py-3">
                      <AssignmentStatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#888]">{formatDate(a.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="inline-flex items-stretch border border-[#1A1A1A] bg-[#0A0A0A]">
      <span className="border-r border-[#1A1A1A] px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[#666]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0A0A0A] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white outline-none"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}
