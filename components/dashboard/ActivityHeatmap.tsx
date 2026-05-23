"use client";

import type { ManualSession } from "./types";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function intensityColor(count: number): string {
  if (count <= 0) return "#161616";
  if (count === 1) return "#3A0000";
  if (count === 2) return "#5A0000";
  if (count === 3) return "#7A0000";
  return "#9A0000";
}

export function ActivityHeatmap({
  sessions,
  days = 30,
}: {
  sessions: ManualSession[];
  days?: number;
}) {
  const today = startOfDay(new Date());
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const d = startOfDay(new Date(s.date));
    const diff = Math.floor((+today - +d) / 86400000);
    if (diff < 0 || diff >= days) continue;
    const k = dateKey(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  // Build list of days (oldest first)
  const cells: { date: Date; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    cells.push({ date: d, count: counts.get(dateKey(d)) ?? 0 });
  }

  // Pack into weeks columns. Monday = 0
  const weekIndex = (d: Date) => {
    const day = d.getDay(); // 0=Sun
    return day === 0 ? 6 : day - 1; // Monday=0..Sunday=6
  };

  // Determine columns: group by week
  type Col = (typeof cells)[number] | null;
  const columns: Col[][] = [];
  let current: Col[] = Array(7).fill(null);
  cells.forEach((c, i) => {
    const w = weekIndex(c.date);
    if (i > 0 && w === 0) {
      columns.push(current);
      current = Array(7).fill(null);
    }
    current[w] = c;
  });
  columns.push(current);

  const total = cells.reduce((s, c) => s + c.count, 0);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-2">
        <div className="flex flex-col gap-1.5 py-0.5">
          {WEEKDAYS.map((w, i) => (
            <div
              key={i}
              className="h-4 w-4 font-mono text-[8px] uppercase leading-4 tracking-[0.18em] text-[#555]"
            >
              {i % 2 === 0 ? w : ""}
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1.5">
              {col.map((cell, ri) =>
                cell ? (
                  <div
                    key={ri}
                    className="h-4 w-4 border border-[#1A1A1A] transition-transform hover:scale-110"
                    style={{ background: intensityColor(cell.count) }}
                    title={`${cell.date.toLocaleDateString("fr-FR")} — ${cell.count} session${cell.count > 1 ? "s" : ""}`}
                  />
                ) : (
                  <div key={ri} className="h-4 w-4" />
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#666]">
          {total} session{total > 1 ? "s" : ""} sur {days} jours
        </p>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#555]">Moins</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className="inline-block h-4 w-4 border border-[#1A1A1A]"
              style={{ background: intensityColor(n) }}
            />
          ))}
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#555]">Plus</span>
        </div>
      </div>
    </div>
  );
}
