"use client";

import type { ReactNode } from "react";
import type { AssignmentStatus, ShooterStatus } from "./types";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-[#1A1A1A] bg-[#0A0A0A] transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  hint,
  danger = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <Card
      className={`p-5 ${
        danger ? "border-[#E84040]/40 bg-[#E84040]/[0.04]" : ""
      }`}
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#888]">
        {label}
      </p>
      <p
        className={`mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight md:text-4xl ${
          danger ? "text-[#E84040]" : "text-white"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#666]">
          {hint}
        </p>
      )}
    </Card>
  );
}

const statusStyles: Record<ShooterStatus, string> = {
  active: "border-[#00FF44]/40 text-[#00FF44] bg-[#00FF44]/[0.06]",
  pending: "border-[#FFB300]/40 text-[#FFB300] bg-[#FFB300]/[0.06]",
};

export function ShooterStatusBadge({ status }: { status: ShooterStatus }) {
  return (
    <span
      className={`inline-flex border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] ${statusStyles[status]}`}
    >
      {status === "active" ? "Actif" : "En attente"}
    </span>
  );
}

const assignmentStyles: Record<AssignmentStatus, string> = {
  completed: "border-[#00FF44]/40 text-[#00FF44] bg-[#00FF44]/[0.06]",
  pending: "border-[#FFB300]/40 text-[#FFB300] bg-[#FFB300]/[0.06]",
  overdue: "border-[#E84040]/50 text-[#E84040] bg-[#E84040]/[0.08]",
  draft: "border-[#333] text-[#888] bg-[#111]",
};

const assignmentLabels: Record<AssignmentStatus, string> = {
  completed: "Complétée",
  pending: "En cours",
  overdue: "En retard",
  draft: "Brouillon",
};

export function AssignmentStatusBadge({
  status,
}: {
  status: AssignmentStatus;
}) {
  return (
    <span
      className={`inline-flex border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] ${assignmentStyles[status]}`}
    >
      {assignmentLabels[status]}
    </span>
  );
}

export function ProfileBadge({ pro }: { pro: boolean }) {
  return (
    <span
      className={`inline-flex border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] ${
        pro
          ? "border-[#7A0000] bg-[#7A0000]/20 text-white"
          : "border-[#333] text-[#888]"
      }`}
    >
      {pro ? "Pro" : "Civil"}
    </span>
  );
}

export function TrendArrow({
  trend,
}: {
  trend: "up" | "down" | "flat" | null;
}) {
  if (trend === null) return <span className="text-[#444]">—</span>;
  if (trend === "up")
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#00FF44]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 19L12 5L19 19" />
        </svg>
      </span>
    );
  if (trend === "down")
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#E84040]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 5L12 19L19 5" />
        </svg>
      </span>
    );
  return (
    <span className="inline-flex items-center font-mono text-xs text-[#888]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M5 12H19" />
      </svg>
    </span>
  );
}

export function AssignmentTriad({
  done,
  pending,
  overdue,
}: {
  done: number;
  pending: number;
  overdue: number;
}) {
  return (
    <div className="inline-flex gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em]">
      <span className="border border-[#00FF44]/40 bg-[#00FF44]/[0.06] px-1.5 py-0.5 tabular-nums text-[#00FF44]">
        {done}
      </span>
      <span className="border border-[#FFB300]/40 bg-[#FFB300]/[0.06] px-1.5 py-0.5 tabular-nums text-[#FFB300]">
        {pending}
      </span>
      <span
        className={`border px-1.5 py-0.5 tabular-nums ${
          overdue > 0
            ? "border-[#E84040]/50 bg-[#E84040]/[0.08] text-[#E84040]"
            : "border-[#333] text-[#555]"
        }`}
      >
        {overdue}
      </span>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow && (
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7A0000]">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 font-mono text-xl font-bold uppercase tracking-tight text-white md:text-2xl">
        {title}
      </h2>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-[#1A1A1A] bg-[#0A0A0A] px-6 py-12 text-center font-mono text-xs uppercase tracking-[0.22em] text-[#666]">
      {children}
    </div>
  );
}
