"use client";

import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ManualSession } from "./types";
import { moduleColor, moduleLabel } from "./modules";

export interface ProgressionPoint {
  t: number;
  date: string;
  score: number;
  module: string;
}

function linearRegression(points: ProgressionPoint[]) {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.t, 0);
  const sumY = points.reduce((s, p) => s + p.score, 0);
  const sumXY = points.reduce((s, p) => s + p.t * p.score, 0);
  const sumXX = points.reduce((s, p) => s + p.t * p.t, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function toPoints(sessions: ManualSession[]): ProgressionPoint[] {
  return sessions
    .filter(
      (s) => typeof s.normalized_score === "number" && s.normalized_score !== null
    )
    .map((s) => ({
      t: +new Date(s.date),
      date: s.date,
      score: s.normalized_score as number,
      module: s.module ?? "autre",
    }))
    .sort((a, b) => a.t - b.t);
}

function formatTickDate(t: number) {
  return new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function ProgressionChart({
  sessions,
  height = 320,
}: {
  sessions: ManualSession[];
  height?: number;
}) {
  const points = toPoints(sessions);
  if (points.length === 0) return null;

  const reg = linearRegression(points);
  const trendLine = reg
    ? points.map((p) => ({
        t: p.t,
        trend: Math.max(0, Math.min(100, reg.slope * p.t + reg.intercept)),
      }))
    : [];

  const modulesPresent = Array.from(new Set(points.map((p) => p.module)));

  return (
    <div className="w-full">
      <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#1A1A1A" />
          <XAxis
            type="number"
            dataKey="t"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatTickDate}
            tick={{ fill: "#888", fontFamily: "var(--font-mono)", fontSize: 11 }}
            stroke="#1A1A1A"
            allowDuplicatedCategory={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#888", fontFamily: "var(--font-mono)", fontSize: 11 }}
            stroke="#1A1A1A"
            width={32}
          />
          <Tooltip
            cursor={{ stroke: "#333", strokeDasharray: "2 4" }}
            contentStyle={{
              background: "#0A0A0A",
              border: "1px solid #1A1A1A",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#fff",
            }}
            labelStyle={{
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: 10,
            }}
            labelFormatter={(label) =>
              new Date(Number(label)).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            }
            formatter={(value, name) => {
              if (name === "trend") return [Number(value).toFixed(1), "Tendance"];
              return [Number(value).toFixed(1), "Score"];
            }}
          />
          {/* Line connecting scores */}
          <Line
            data={points}
            type="monotone"
            dataKey="score"
            stroke="#FFFFFF"
            strokeOpacity={0.25}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            activeDot={false}
            legendType="none"
            name="score"
          />
          {/* Per-module scatter for colored dots */}
          {modulesPresent.map((m) => (
            <Scatter
              key={m}
              name={moduleLabel(m)}
              data={points.filter((p) => p.module === m)}
              dataKey="score"
              fill={moduleColor(m)}
              isAnimationActive={false}
              legendType="none"
            />
          ))}
          {reg && (
            <Line
              data={trendLine}
              type="linear"
              dataKey="trend"
              stroke="#7A0000"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
              legendType="none"
              name="trend"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#888]">
        {modulesPresent.map((m) => (
          <span key={m} className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: moduleColor(m) }} />
            {moduleLabel(m)}
          </span>
        ))}
        {reg && (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-[2px] w-5" style={{ background: "#7A0000" }} />
            Tendance
          </span>
        )}
      </div>
    </div>
  );
}
