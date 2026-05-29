export type ShooterStatus = "active" | "pending";

export type AssignmentStatus = "pending" | "completed" | "overdue" | "draft";

export type AssignmentType = "module" | "carnet" | "free";

export type ModuleKind =
  | "basique"
  | "dry_fire"
  | "speciales"
  | "vector"
  | "shot_timer"
  | "stages"
  | "degrade";

export interface Shooter {
  id: string;
  instructor_id: string;
  shooter_id: string | null;
  name: string;
  unit: string | null;
  grade: string | null;
  specialite: string | null;
  instructor_notes: string | null;
  status: ShooterStatus;
  linked_at: string;
}

export interface ManualSession {
  id: string;
  instructor_shooter_id: string;
  date: string;
  module: string | null;
  normalized_score: number | null;
  total_shots: number | null;
  accuracy: number | null;
  notes: string | null;
  created_at: string;
}

export type SessionSource = "manual" | "module";

/** Vue unifiée : manual_sessions (clé instructor_shooter_id) +
 *  module_sessions (clé user_id remappée vers instructor_shooter_id). */
export interface UnifiedSession extends ManualSession {
  source: SessionSource;
  hit_factor: number | null;
  module_session_id: string | null;
}

export type TargetKind = "TSV" | "Précision" | "Plaques" | "Autre";

export interface SessionExercise {
  titre: string;
  consignes: string;
  repetitions: number | null;
  distance: string;
  cible: TargetKind | "";
}

export interface SessionContent {
  objectifs: string;
  exercices: SessionExercise[];
  consignes_generales: string;
  materiel: string;
  duree_estimee: string;
  notes_instructeur: string;
}

export interface Assignment {
  id: string;
  instructor_shooter_id: string;
  type: AssignmentType;
  module_kind: ModuleKind | null;
  title: string;
  description: string | null;
  deadline: string | null;
  status: AssignmentStatus;
  completed_at: string | null;
  module_session_id: string | null;
  created_at: string;
  content: SessionContent | null;
}

export interface ShooterWithStats extends Shooter {
  sessions: ManualSession[];
  assignments: Assignment[];
  lastSession: ManualSession | null;
  avgScore: number | null;
  trend: "up" | "down" | "flat" | null;
  doneCount: number;
  pendingCount: number;
  overdueCount: number;
}
