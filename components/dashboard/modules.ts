export const MODULE_COLORS: Record<string, string> = {
  basique: "#FFB300",
  dry_fire: "#4D8AFF",
  speciales: "#B94DFF",
  vector: "#FF6B00",
  carnet: "#00E5FF",
  competition: "#FFD600",
};

export const MODULE_LABELS: Record<string, string> = {
  basique: "Basique",
  dry_fire: "Dry Fire",
  speciales: "Spéciales",
  vector: "Vector",
  carnet: "Carnet",
  competition: "Compétition",
};

export function moduleColor(key: string | null | undefined): string {
  if (!key) return "#888888";
  return MODULE_COLORS[key] ?? "#888888";
}

export function moduleLabel(key: string | null | undefined): string {
  if (!key) return "Autre";
  return MODULE_LABELS[key] ?? key;
}
