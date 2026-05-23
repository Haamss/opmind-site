import { getSupabase } from "@/lib/supabase";
import type {
  Assignment,
  ManualSession,
  Shooter,
  ShooterWithStats,
} from "./types";

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

export async function fetchAssignments(
  shooterIds: string[]
): Promise<Assignment[]> {
  if (shooterIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("instructor_assignments")
    .select(
      "id,instructor_shooter_id,type,module_kind,title,description,deadline,status,completed_at,created_at,content"
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
