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
                    {sessions.map((s) => {
                      // Seules les séances "module" ont un feedback (session_feedback.session_id = module_sessions.id).
                      const linkable =
                        s.source === "module" && !!s.module_session_id;
                      return (
                      <tr
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
                        className={`border-b border-[#111] ${
                          linkable
                            ? "cursor-pointer transition-colors hover:bg-[#111] focus:bg-[#111] focus:outline-none"
                            : ""
                        }`}
                      >
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
                          <span className="flex items-center justify-between gap-2">
                            <span>
                              {s.notes || <span className="text-[#444]">—</span>}
                            </span>
                            {linkable && (
                              <span className="shrink-0 font-semibold uppercase tracking-[0.18em] text-[#00E5FF]">
                                Détail ▸
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </div>

          {/* ASSIGNMENTS */}
          <div className="mb-10">
            <SectionTitle eyebrow="04" title="Assignations" />

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
                          {a.status === "completed" && a.module_session_id && (
                            <button
                              type="button"
                              onClick={() =>
                                openLinkedSession(a.module_session_id!)
                              }
                              className="ml-2 inline-flex items-center gap-1.5 border border-[#1A1A1A] bg-transparent px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#00E5FF] hover:text-[#00E5FF]"
                              aria-label={`Ouvrir la séance liée — ${a.title}`}
                            >
                              Séance ▸
                            </button>
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
