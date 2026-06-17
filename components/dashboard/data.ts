import { getSupabase } from "@/lib/supabase";
import { normalizeSourceModule } from "./modules";
import type {
  Assignment,
  ManualSession,
  Shooter,
  ShooterWithStats,
  UnifiedSession,
} from "./types";

export interface ModuleSessionRow {
  id: string;
  user_id: string;
  source_module: string | null;
  date: string;
  normalized_score: number | null;
  accuracy: number | null;
  total_shots: number | null;
  hit_factor: number | null;
}

export async function fetchShooters(): Promise<Shooter[]> {
  const { data, error } = await getSupabase()
    .from("instructor_shooters")
    .select(
      "id,instructor_id,shooter_id,name,unit,grade,specialite,instructor_notes,status,linked_at"
    )
    .order("linked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Shooter[];
}

export async function fetchSessions(
  shooterIds: string[]
): Promise<ManualSession[]> {
  if (shooterIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("manual_sessions")
    .select(
      "id,instructor_shooter_id,date,module,normalized_score,total_shots,accuracy,notes,created_at"
    )
    .in("instructor_shooter_id", shooterIds)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ManualSession[];
}

export async function fetchModuleSessions(
  shooterUserIds: string[]
): Promise<ModuleSessionRow[]> {
  if (shooterUserIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("module_sessions")
    .select(
      "id,user_id,source_module,date,normalized_score,accuracy,total_shots,hit_factor"
    )
    .in("user_id", shooterUserIds)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ModuleSessionRow[];
}

export async function fetchModuleSessionById(
  id: string
): Promise<ModuleSessionRow | null> {
  const { data, error } = await getSupabase()
    .from("module_sessions")
    .select(
      "id,user_id,source_module,date,normalized_score,accuracy,total_shots,hit_factor"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ModuleSessionRow | null) ?? null;
}

export interface FeedbackAnswer {
  question: string;
  rating: number;
}

export interface SessionFeedbackRow {
  id: string;
  session_id: string;
  difficulty: number | null;
  enjoyment: number | null;
  free_text: string | null;
  answers: FeedbackAnswer[] | null;
}

/**
 * Feedback tireur par séance (clé session_id = module_sessions.id).
 * RLS instructeur déjà en place : la lecture est filtrée en base sur le
 * lien instructor_shooters → on n'ajoute aucun filtre user_id ici.
 */
export async function fetchSessionFeedback(
  sessionIds: string[]
): Promise<SessionFeedbackRow[]> {
  if (sessionIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("session_feedback")
    .select("id,session_id,difficulty,enjoyment,free_text,answers")
    .in("session_id", sessionIds);
  if (error) throw error;
  return (data ?? []) as SessionFeedbackRow[];
}

/**
 * Source unique pour analytics + fiche tireur : fusionne manual_sessions
 * (clé instructor_shooter_id) et module_sessions (clé user_id remappée via
 * instructor_shooters.shooter_id), avec un discriminant `source`.
 */
export async function fetchUnifiedSessions(
  shooters: Shooter[]
): Promise<UnifiedSession[]> {
  const ids = shooters.map((s) => s.id);
  // module_sessions.user_id -> instructor_shooters.id
  const idByUser = new Map<string, string>();
  for (const s of shooters) {
    if (s.shooter_id) idByUser.set(s.shooter_id, s.id);
  }

  const [manual, modules] = await Promise.all([
    fetchSessions(ids),
    fetchModuleSessions([...idByUser.keys()]),
  ]);

  const manualU: UnifiedSession[] = manual.map((m) => ({
    ...m,
    source: "manual",
    hit_factor: null,
    module_session_id: null,
  }));

  const moduleU: UnifiedSession[] = modules
    .filter((r) => idByUser.has(r.user_id))
    .map((r) => ({
      id: r.id,
      instructor_shooter_id: idByUser.get(r.user_id)!,
      date: r.date,
      module: normalizeSourceModule(r.source_module),
      normalized_score: r.normalized_score,
      total_shots: r.total_shots,
      accuracy: r.accuracy,
      notes: null,
      created_at: r.date,
      source: "module",
      hit_factor: r.hit_factor,
      module_session_id: r.id,
    }));

  return [...manualU, ...moduleU].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date)
  );
}

export async function fetchAssignments(
  shooterIds: string[]
): Promise<Assignment[]> {
  if (shooterIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("instructor_assignments")
    .select(
      "id,instructor_shooter_id,type,module_kind,title,description,deadline,status,completed_at,module_session_id,created_at,content"
    )
    .in("instructor_shooter_id", shooterIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Assignment[];
}

export function joinShooterStats(
  shooters: Shooter[],
  sessions: ManualSession[],
  assignments: Assignment[]
): ShooterWithStats[] {
  return shooters.map((s) => {
    const ss = sessions
      .filter((x) => x.instructor_shooter_id === s.id)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
    const aa = assignments.filter((x) => x.instructor_shooter_id === s.id);

    const validScores = ss
      .map((x) => x.normalized_score)
      .filter((v): v is number => typeof v === "number");
    const avgScore =
      validScores.length > 0
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : null;

    const recent = ss.slice(0, 3).reverse();
    let trend: "up" | "down" | "flat" | null = null;
    if (recent.length >= 2) {
      const first = recent[0].normalized_score ?? null;
      const last = recent[recent.length - 1].normalized_score ?? null;
      if (typeof first === "number" && typeof last === "number") {
        const delta = last - first;
        trend = delta > 1 ? "up" : delta < -1 ? "down" : "flat";
      }
    }

    return {
      ...s,
      sessions: ss,
      assignments: aa,
      lastSession: ss[0] ?? null,
      avgScore,
      trend,
      doneCount: aa.filter((x) => x.status === "completed").length,
      pendingCount: aa.filter((x) => x.status === "pending").length,
      overdueCount: aa.filter((x) => x.status === "overdue").length,
    };
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function isPro(shooter: Pick<Shooter, "unit">): boolean {
  return !!shooter.unit && shooter.unit.trim().length > 0;
}
