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
  fetchSessions,
  formatDate,
  isPro,
} from "@/components/dashboard/data";
import { moduleColor, moduleLabel } from "@/components/dashboard/modules";
import { ProgressionChart } from "@/components/dashboard/ProgressionChart";
import { NewAssignmentModal } from "@/components/dashboard/NewAssignmentModal";
import { downloadSessionPdf } from "@/lib/sessionPdf";
import {
  AssignmentStatusBadge,
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
} from "@/components/dashboard/types";

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
  const [sessions, setSessions] = useState<ManualSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [instructorName, setInstructorName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
        fetchSessions([id]),
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
    const scored = sessions
      .map((s) => s.normalized_score)
      .filter((v): v is number => typeof v === "number");
    const avgScore =
      scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
    const bestScore = scored.length > 0 ? Math.max(...scored) : null;

    const acc = sessions
      .map((s) => s.accuracy)
      .filter((v): v is number => typeof v === "number");
    const avgAccuracy =
      acc.length > 0 ? acc.reduce((a, b) => a + b, 0) / acc.length : null;

    return {
      avgScore,
      bestScore,
      count: sessions.length,
      avgAccuracy,
    };
  }, [sessions]);

  const moduleBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      const k = s.module ?? "autre";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([module, count]) => ({ module, count, label: moduleLabel(module) }))
      .sort((a, b) => b.count - a.count);
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
    <div className="px-6 py-8 md:px-10 md:py-10">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#888] transition-colors hover:text-white"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Retour
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
          <Card className="mb-8 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ProfileBadge pro={isPro(shooter)} />
                  <ShooterStatusBadge status={shooter.status} />
                </div>
                <h1 className="mt-3 font-mono text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
                  {shooter.name}
                </h1>
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#888]">
                  {[shooter.grade, shooter.unit || shooter.specialite]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#666]">
                  Lié depuis
                </p>
                <p className="mt-1 font-mono text-sm text-white">{formatDate(shooter.linked_at)}</p>
              </div>
            </div>
            {shooter.instructor_notes && (
              <div className="mt-5 border-l-2 border-[#7A0000] bg-black px-4 py-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#666]">
                  Notes instructeur
                </p>
                <p className="mt-2 font-mono text-sm text-[#aaa]">{shooter.instructor_notes}</p>
              </div>
            )}
          </Card>

          {/* STATS */}
          <div className="mb-10 grid gap-3 md:grid-cols-4">
            <KpiTile
              label="Score moyen"
              value={stats.avgScore !== null ? stats.avgScore.toFixed(1) : "—"}
              hint="0 — 100"
            />
            <KpiTile
              label="Meilleur score"
              value={stats.bestScore !== null ? stats.bestScore.toFixed(1) : "—"}
            />
            <KpiTile label="Sessions" value={stats.count} />
            <KpiTile
              label="Précision moyenne"
              value={
                stats.avgAccuracy !== null
                  ? `${(stats.avgAccuracy * 100).toFixed(0)}%`
                  : "—"
              }
            />
          </div>

          {/* PROGRESSION */}
          <div className="mb-10">
            <SectionTitle eyebrow="01" title="Progression" />
            {sessions.length === 0 ? (
              <EmptyState>Aucune session enregistrée</EmptyState>
            ) : (
              <Card className="p-4">
                <ProgressionChart sessions={sessions} height={320} />
              </Card>
            )}
          </div>

          {/* MODULE BREAKDOWN */}
          <div className="mb-10">
            <SectionTitle eyebrow="02" title="Répartition par module" />
            {moduleBreakdown.length === 0 ? (
              <EmptyState>Aucune donnée</EmptyState>
            ) : (
              <Card className="p-4">
                <div style={{ width: "100%", height: Math.max(180, moduleBreakdown.length * 40 + 60) }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={moduleBreakdown}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid stroke="#1A1A1A" horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: "#888", fontFamily: "var(--font-mono)", fontSize: 11 }}
                        stroke="#1A1A1A"
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={110}
                        tick={{ fill: "#aaa", fontFamily: "var(--font-mono)", fontSize: 11 }}
                        stroke="#1A1A1A"
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
                        labelStyle={{ color: "#fff" }}
                        formatter={(v) => [Number(v), "Sessions"]}
                      />
                      <Bar dataKey="count" isAnimationActive={false}>
                        {moduleBreakdown.map((d, i) => (
                          <Cell key={i} fill={moduleColor(d.module)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>

          {/* SESSIONS TABLE */}
          <div className="mb-10">
            <SectionTitle eyebrow="03" title="Historique des sessions" />
            {sessions.length === 0 ? (
              <EmptyState>Aucune session enregistrée</EmptyState>
            ) : (
              <Card className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#1A1A1A] text-left">
                      <Th>Date</Th>
                      <Th>Module</Th>
                      <Th className="text-right">Score</Th>
                      <Th className="text-right">Coups</Th>
                      <Th className="text-right">Précision</Th>
                      <Th>Notes</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className="border-b border-[#111]">
                        <td className="px-4 py-3 font-mono text-xs text-[#aaa]">{formatDate(s.date)}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
                          >
                            <span
                              className="inline-block h-2 w-2"
                              style={{ background: moduleColor(s.module) }}
                            />
                            {moduleLabel(s.module)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-white">
                          {typeof s.normalized_score === "number" ? s.normalized_score.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-[#aaa]">
                          {s.total_shots ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-[#aaa]">
                          {typeof s.accuracy === "number" ? `${(s.accuracy * 100).toFixed(0)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#888]">
                          {s.notes || <span className="text-[#444]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>

          {/* ASSIGNMENTS */}
          <div className="mb-10">
            <div className="mb-5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7A0000]">04</p>
              <h2 className="mt-2 font-mono text-xl font-bold uppercase tracking-tight text-white md:text-2xl">
                Assignations
              </h2>
            </div>

            <Link
              href={`/dashboard/shooter/session/new/?id=${shooter.id}`}
              className="mb-4 flex w-full items-center justify-center gap-3 border border-[#7A0000] bg-[#7A0000] px-6 py-4 font-mono text-sm font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#9A0000]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Créer une séance
            </Link>

            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#888] transition-colors hover:text-white"
              >
                + Assignation rapide
              </button>
            </div>

            {assignments.length === 0 ? (
              <EmptyState>Aucune assignation</EmptyState>
            ) : (
              <Card className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#1A1A1A] text-left">
                      <Th>Titre</Th>
                      <Th>Type</Th>
                      <Th>Module</Th>
                      <Th>Deadline</Th>
                      <Th>Statut</Th>
                      <Th className="text-right">PDF</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr
                        key={a.id}
                        className={`border-b border-[#111] ${
                          a.status === "overdue" ? "bg-[#E84040]/[0.05]" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-mono text-sm font-semibold text-white">{a.title}</p>
                          {a.description && (
                            <p className="mt-1 max-w-md font-mono text-[11px] whitespace-pre-line text-[#888]">{a.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#aaa]">
                          {a.type}
                        </td>
                        <td className="px-4 py-3">
                          {a.module_kind ? (
                            <span
                              className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
                            >
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
                        <td className="px-4 py-3 text-right">
                          {a.content ? (
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
                              className="inline-flex items-center gap-1.5 border border-[#1A1A1A] bg-transparent px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#7A0000] hover:text-[#7A0000]"
                              aria-label={`Télécharger la fiche PDF — ${a.title}`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                              </svg>
                              PDF
                            </button>
                          ) : (
                            <span className="font-mono text-[10px] text-[#444]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>

          <NewAssignmentModal
            shooterId={shooter.id}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onCreated={() => load()}
          />
        </>
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
