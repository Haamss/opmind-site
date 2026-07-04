// Scoring PAR MODULE, calculé au read depuis le brut. Fonctions pures, zéro
// dépendance React/Next, testables isolément. Ce module est la version
// canonique ; les call sites (shooter/mes-tireurs/comparatif) seront rebranchés
// dessus dans les commits suivants.

import { accuracyPct } from "./format";
import { MODULE_COLORS, moduleColor } from "./modules";

/* ────────────────────────────── Régression ────────────────────────────── */

export interface Regression {
  slope: number;
  intercept: number;
  r2: number;
}

/** Moindres carrés sur des points (x,y). Version canonique factorisant les 3
 *  implémentations dupliquées du repo (shooter inline, page.tsx,
 *  ProgressionChart.tsx). n < 2 → droite plate au niveau moyen, r2 = 0. */
export function linearRegression(points: { x: number; y: number }[]): Regression {
  const n = points.length;
  if (n < 2) {
    const y = n === 1 ? points[0].y : 0;
    return { slope: 0, intercept: y, r2: 0 };
  }
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sxy += p.x * p.y;
    sxx += p.x * p.x;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) {
    return { slope: 0, intercept: sy / n, r2: 0 };
  }
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;

  const meanY = sy / n;
  let ssTot = 0, ssRes = 0;
  for (const p of points) {
    const pred = slope * p.x + intercept;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - pred) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

/* ─────────────────────────── Moyenne mobile ──────────────────────────── */

/** Moyenne mobile trailing (fenêtre glissante). Retourne un tableau de MÊME
 *  longueur : l'élément i = moyenne de values[i-window+1 .. i] (borné à 0). */
export function movingAverage(values: number[], window = 3): number[] {
  const w = Math.max(1, Math.floor(window));
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - w + 1);
    let sum = 0;
    for (let j = start; j <= i; j++) sum += values[j];
    out.push(sum / (i - start + 1));
  }
  return out;
}

/* ─────────────────────────── Axes par module ─────────────────────────── */

export type ModuleMetric = "accuracy" | "hit_factor" | "avg_split" | "volume";

export interface ModuleAxis {
  /** true = tir réel noté ; false = subjectif/volume (jamais de « record »). */
  scored: boolean;
  primary: ModuleMetric;
  unit: "%" | "HF" | "s" | "reps";
  /** true pour avg_split (un split plus court est meilleur). */
  lowerIsBetter?: boolean;
  label: string;
}

/** Fallback pour les modules non listés (vector, stages, degrade, …). À
 *  raffiner quand leurs métriques natives seront spécifiées. */
export const DEFAULT_AXIS: ModuleAxis = {
  scored: false,
  primary: "volume",
  unit: "reps",
  label: "Volume",
};

/** Clés = module_kind normalisé (cf. normalizeSourceModule dans modules.ts),
 *  PAS les slugs source_module bruts. */
export const MODULE_AXIS: Record<string, ModuleAxis> = {
  basique: { scored: true, primary: "accuracy", unit: "%", label: "Précision" },
  speciales: { scored: true, primary: "accuracy", unit: "%", label: "Précision" },
  carnet: { scored: true, primary: "accuracy", unit: "%", label: "Précision" },
  shot_timer: {
    scored: true,
    primary: "avg_split",
    unit: "s",
    lowerIsBetter: true,
    label: "Split moyen",
  },
  dry_fire: { scored: false, primary: "volume", unit: "reps", label: "Volume" },
};

export function moduleAxis(module: string | null | undefined): ModuleAxis {
  if (!module) return DEFAULT_AXIS;
  return MODULE_AXIS[module] ?? DEFAULT_AXIS;
}

/* ────────────────────────── Métrique native ──────────────────────────── */

/** Shape structurelle minimale : UnifiedSession la satisfait (avg_split absent
 *  = optionnel, toléré). Garde le module pur et testable sans importer les
 *  types d'écran. */
export interface ScoredSession {
  module: string | null;
  normalized_score?: number | null;
  accuracy?: number | null;
  total_shots?: number | null;
  hit_factor?: number | null;
  avg_split?: number | null;
}

/** Valeur de la métrique NATIVE de la session selon l'axe de son module.
 *  accuracy → normalisée 0-100 via accuracyPct. Renvoie null si absente. */
export function moduleMetric(session: ScoredSession): number | null {
  const axis = moduleAxis(session.module);
  switch (axis.primary) {
    case "accuracy":
      return accuracyPct(session.accuracy);
    case "hit_factor":
      return session.hit_factor ?? null;
    case "avg_split":
      return session.avg_split ?? null;
    case "volume":
      return session.total_shots ?? null;
    default:
      return null;
  }
}

/* ─────────────────────────── Best par module ─────────────────────────── */

/** Meilleure séance PAR module (jamais un max inter-modules). Les modules
 *  scored:false (dry_fire, volume) n'ont pas de « record » → absents du
 *  résultat. lowerIsBetter respecté (split le plus court = meilleur). */
export function bestByModule<T extends ScoredSession>(
  sessions: T[]
): Record<string, T> {
  const best: Record<string, T> = {};
  const bestVal: Record<string, number> = {};
  for (const s of sessions) {
    const key = s.module;
    if (!key) continue;
    const axis = moduleAxis(key);
    if (!axis.scored) continue;
    const v = moduleMetric(s);
    if (v == null) continue;
    const prev = bestVal[key];
    const better =
      prev === undefined || (axis.lowerIsBetter ? v < prev : v > prev);
    if (better) {
      best[key] = s;
      bestVal[key] = v;
    }
  }
  return best;
}

/* ──────────────────────────────── Palette ────────────────────────────── */

/** Couleur de courbe basée sur la palette COMPLÈTE (modules.ts), pas le
 *  sous-ensemble à 3 de format.ts. Ré-export de moduleColor (fallback inclus)
 *  pour une source unique — vector/stages/… ne tombent plus en gris. */
export const moduleChartColor = moduleColor;

/** Ré-export de commodité pour les écrans qui veulent la palette entière. */
export { MODULE_COLORS };
