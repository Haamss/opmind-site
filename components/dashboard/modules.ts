export const MODULE_COLORS: Record<string, string> = {
  basique: "#FFB300",
  dry_fire: "#4D8AFF",
  speciales: "#B94DFF",
  vector: "#FF6B00",
  shot_timer: "#E84040",
  stages: "#00E5FF",
  degrade: "#FFB300",
  carnet: "#00E5FF",
  competition: "#FFD600",
};

export const MODULE_LABELS: Record<string, string> = {
  basique: "Basique",
  dry_fire: "Dry Fire",
  speciales: "Spéciales",
  vector: "Vector",
  shot_timer: "Shot Timer",
  stages: "Stages",
  degrade: "Dégradé",
  carnet: "Carnet",
  competition: "Compétition",
};

// Slugs source_module (app/module_sessions) → clés module_kind (labels/couleurs).
const SOURCE_MODULE_TO_KIND: Record<string, string> = {
  "basic-module": "basique",
  "dry-fire": "dry_fire",
  vector: "vector",
  "degrade-module": "degrade",
  "shot-timer": "shot_timer",
  stage: "stages",
  speciales: "speciales",
};

/** Normalise un source_module (slug app) en clé module_kind. Slug inconnu /
 *  module manuel en texte libre → renvoyé tel quel. */
export function normalizeSourceModule(
  src: string | null | undefined
): string | null {
  if (!src) return null;
  return SOURCE_MODULE_TO_KIND[src] ?? src;
}

export function moduleColor(key: string | null | undefined): string {
  if (!key) return "#888888";
  return MODULE_COLORS[key] ?? "#888888";
}

export function moduleLabel(key: string | null | undefined): string {
  if (!key) return "Autre";
  return MODULE_LABELS[key] ?? key;
}
