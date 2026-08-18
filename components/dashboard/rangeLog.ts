// Carnet réglementaire — couche data + types manuels (pas de types Supabase
// générés dans ce repo). Une entrée = une séance réglementaire validable par
// l'instructeur. Fonctions pures d'accès (fetch/insert/rpc), zéro JSX.

import { getSupabase } from "@/lib/supabase";
import type { Shooter } from "./types";

/* ────────────────────────────── Taxonomie ────────────────────────────── */

export type Regime = "pia207" | "fdo" | "club";
export type ValidationStatus = "draft" | "pending" | "validated" | "rejected";
// session_type est un text libre en base ; ces 4 valeurs sont les cas connus.
export type SessionType =
  | "tir_controle"
  | "ist_c"
  | "entrainement"
  | "seance_service";

export const REGIME_LABELS: Record<Regime, string> = {
  pia207: "PIA-207 (militaire)",
  fdo: "FDO",
  club: "Club (civil)",
};

export const SESSION_TYPE_LABELS: Record<string, string> = {
  tir_controle: "Tir contrôlé",
  ist_c: "IST-C",
  entrainement: "Entraînement",
  seance_service: "Séance de service",
};

export const VALIDATION_LABELS: Record<ValidationStatus, string> = {
  draft: "Brouillon",
  pending: "En attente",
  validated: "Validée",
  rejected: "Rejetée",
};

/** Régimes proposés à la saisie (ordre d'affichage). */
export const REGIME_OPTIONS: Regime[] = ["pia207", "fdo", "club"];
/** Types de séance proposés à la saisie (ordre d'affichage). */
export const SESSION_TYPE_OPTIONS: SessionType[] = [
  "tir_controle",
  "ist_c",
  "entrainement",
  "seance_service",
];

export function regimeLabel(r: string | null | undefined): string {
  if (!r) return "—";
  return REGIME_LABELS[r as Regime] ?? r;
}
export function sessionTypeLabel(t: string | null | undefined): string {
  if (!t) return "—";
  return SESSION_TYPE_LABELS[t] ?? t;
}

/** Durée en minutes → libellé court (« 1h30 » / « 45 min » / « — »). */
export function fmtDuration(min: number | null | undefined): string {
  if (min == null || min <= 0) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/* ──────────────────────────────── Types ──────────────────────────────── */

export interface RangeLogEntry {
  id: string;
  shooter_user_id: string | null;
  instructor_shooter_id: string | null;
  created_by: string;
  date: string;
  location: string | null;
  regime: Regime;
  session_type: string | null;
  duration_minutes: number | null;
  rounds_fired: number;
  caliber: string | null;
  weapon_id: string | null;
  weapon_label: string | null;
  module_session_id: string | null;
  notes: string | null;
  validation_status: ValidationStatus;
  validated_by: string | null;
  validated_at: string | null;
  validator_name: string | null;
  validator_qualification: string | null;
  validation_note: string | null;
  created_at: string;
}

/** Ligne brute de la vue range_log_compliance (12 mois glissants). */
export interface RangeLogComplianceRow {
  shooter_user_id: string | null;
  instructor_shooter_id: string | null;
  regime: Regime;
  validated_sessions_12m: number;
  validated_minutes_12m: number;
  validated_rounds_12m: number;
  last_validated_at: string | null;
}

/** Conformité agrégée PAR régime (voir fetchRangeLogCompliance / D2). */
export interface RegimeCompliance {
  regime: Regime;
  validated_sessions_12m: number;
  validated_minutes_12m: number;
  validated_rounds_12m: number;
  last_validated_at: string | null;
}

/** Payload de saisie manuelle (instructeur). Les clés de liaison + statut sont
 *  ajoutés par insertRangeLogEntry, pas par l'appelant. */
export interface RangeLogDraft {
  date: string;
  regime: Regime;
  session_type: string | null;
  location: string | null;
  duration_minutes: number | null;
  rounds_fired: number;
  caliber: string | null;
  weapon_label: string | null;
  notes: string | null;
}

const ENTRY_COLS =
  "id,shooter_user_id,instructor_shooter_id,created_by,date,location,regime," +
  "session_type,duration_minutes,rounds_fired,caliber,weapon_id,weapon_label," +
  "module_session_id,notes,validation_status,validated_by,validated_at," +
  "validator_name,validator_qualification,validation_note,created_at";

/** Filtre RLS-friendly : une entrée peut être liée par instructor_shooter_id
 *  ET/OU shooter_user_id (D2). On matche les deux clés. */
function shooterOrFilter(shooter: Shooter): string {
  const clauses = [`instructor_shooter_id.eq.${shooter.id}`];
  if (shooter.shooter_id) clauses.push(`shooter_user_id.eq.${shooter.shooter_id}`);
  return clauses.join(",");
}

/* ──────────────────────────────── Fetch ──────────────────────────────── */

/** Entrées du carnet d'un tireur, triées date desc. */
export async function fetchRangeLogEntries(
  shooter: Shooter
): Promise<RangeLogEntry[]> {
  const { data, error } = await getSupabase()
    .from("range_log_entries")
    .select(ENTRY_COLS)
    .or(shooterOrFilter(shooter))
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RangeLogEntry[];
}

/**
 * Conformité 12 mois par régime.
 *
 * D2 : la vue range_log_compliance groupe par (shooter_user_id,
 * instructor_shooter_id, regime). Un tireur AVEC compte a donc des lignes à
 * clé simple (entrées créées côté app → shooter_user_id seul) ET à double clé
 * (nos saisies instructeur → les deux colonnes) : les compteurs d'un même
 * régime sont éclatés sur plusieurs lignes. On récupère toutes les lignes
 * matchant l'une OU l'autre clé et on SOMME par régime côté client
 * (last_validated_at = max) avant toute évaluation de seuil.
 */
export async function fetchRangeLogCompliance(
  shooter: Shooter
): Promise<RegimeCompliance[]> {
  const { data, error } = await getSupabase()
    .from("range_log_compliance")
    .select(
      "shooter_user_id,instructor_shooter_id,regime,validated_sessions_12m," +
        "validated_minutes_12m,validated_rounds_12m,last_validated_at"
    )
    .or(shooterOrFilter(shooter));
  if (error) throw error;

  const rows = (data ?? []) as unknown as RangeLogComplianceRow[];
  const byRegime = new Map<Regime, RegimeCompliance>();
  for (const r of rows) {
    const agg = byRegime.get(r.regime) ?? {
      regime: r.regime,
      validated_sessions_12m: 0,
      validated_minutes_12m: 0,
      validated_rounds_12m: 0,
      last_validated_at: null as string | null,
    };
    agg.validated_sessions_12m += r.validated_sessions_12m ?? 0;
    agg.validated_minutes_12m += r.validated_minutes_12m ?? 0;
    agg.validated_rounds_12m += r.validated_rounds_12m ?? 0;
    if (
      r.last_validated_at &&
      (agg.last_validated_at === null ||
        r.last_validated_at > agg.last_validated_at)
    ) {
      agg.last_validated_at = r.last_validated_at;
    }
    byRegime.set(r.regime, agg);
  }
  return Array.from(byRegime.values());
}

/* ─────────────────────── Régimes déclarés (précédence) ────────────────── */

/** Ne garde que les valeurs connues, et null si rien ne reste. */
function toRegimes(raw: unknown): Regime[] | null {
  if (!Array.isArray(raw)) return null;
  const kept = REGIME_OPTIONS.filter((r) => raw.includes(r));
  return kept.length ? kept : null;
}

/** Détail des régimes déclarés et de la source retenue. */
export type RegimeSources = {
  /** Ce que le tireur lié déclare sur son profil. null s'il n'a pas de compte. */
  profile: Regime[] | null;
  /** Ce que l'instructeur a déclaré sur la ligne de râtelier. */
  roster: Regime[] | null;
  /** Régimes qui s'appliquent réellement, précédence résolue. */
  effective: Regime[] | null;
  /** D'où vient `effective`. null quand rien n'est déclaré nulle part. */
  source: "profile" | "roster" | null;
};

/**
 * Résout les régimes déclarés d'un tireur, avec le DÉTAIL des sources.
 *
 * Précédence — strictement celle du trigger range_log_enforce_declared_regime :
 * le profil du tireur lié d'abord, la ligne de râtelier en repli dès que le
 * profil ne déclare rien. Rien nulle part = null (le carnet reste ouvert aux
 * trois régimes, la base laisse passer).
 *
 * Une seule requête, et seulement si le tireur a un compte : le repli râtelier
 * est déjà porté par la ligne Shooter que l'appelant détient.
 */
export async function fetchRegimeSources(
  shooter: Shooter
): Promise<RegimeSources> {
  const roster = toRegimes(shooter.carnet_regimes);

  let profile: Regime[] | null = null;
  if (shooter.shooter_id) {
    try {
      const { data } = await getSupabase()
        .from("profiles")
        .select("carnet_regimes")
        .eq("id", shooter.shooter_id)
        .maybeSingle();
      profile = toRegimes((data as { carnet_regimes?: unknown } | null)?.carnet_regimes);
    } catch {
      /* lecture best-effort : on retombe sur le repli râtelier */
    }
  }

  const effective = profile ?? roster;
  return {
    profile,
    roster,
    effective,
    source: profile ? "profile" : roster ? "roster" : null,
  };
}

/**
 * Régimes qui s'appliquent à ce tireur, ou null si aucun n'est déclaré.
 *
 * Point de vérité unique de la précédence côté client : formulaire de saisie
 * et carnet doivent tous deux passer par ici, jamais réimplémenter la règle.
 */
export async function fetchDeclaredRegimes(
  shooter: Shooter
): Promise<Regime[] | null> {
  return (await fetchRegimeSources(shooter)).effective;
}

/* ──────────────────────────── Insert / RPC ───────────────────────────── */

/** Saisie manuelle instructeur. created_by = user courant ; double clé si le
 *  tireur a un compte (D2) ; weapon_id null en V1 (D5) ; statut « pending »
 *  (soumise à validation, D1). */
export async function insertRangeLogEntry(
  shooter: Shooter,
  createdBy: string,
  draft: RangeLogDraft
): Promise<void> {
  const { error } = await getSupabase()
    .from("range_log_entries")
    .insert({
      instructor_shooter_id: shooter.id,
      shooter_user_id: shooter.shooter_id ?? null,
      created_by: createdBy,
      weapon_id: null,
      validation_status: "pending",
      ...draft,
    });
  if (error) throw error;
}

/** Validation / rejet via la RPC SECURITY DEFINER (toujours qualifiée). La RPC
 *  vérifie elle-même le lien instructeur↔tireur et fige les snapshots
 *  validator_name/qualification. */
export async function validateRangeLogEntry(
  entryId: string,
  action: "validate" | "reject",
  note?: string
): Promise<void> {
  const { error } = await getSupabase().rpc("validate_range_log_entry", {
    p_entry_id: entryId,
    p_action: action,
    p_note: note ?? null,
  });
  if (error) throw error;
}
