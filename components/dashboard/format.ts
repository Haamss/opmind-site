import { moduleLabel } from "./modules";

export function fmtDot(iso: string | null, withYear = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return withYear
    ? `${dd} · ${mm} · ${String(d.getFullYear()).slice(-2)}`
    : `${dd} · ${mm}`;
}

export function moduleBadgeClass(
  m: string | null
): "spec" | "base" | "dry" | "flat" {
  if (m === "speciales") return "spec";
  if (m === "basique") return "base";
  if (m === "dry_fire") return "dry";
  return "flat";
}

export const MOD_CHART_COLOR: Record<string, string> = {
  speciales: "#b455e6",
  basique: "#f5a623",
  dry_fire: "#4f8ff0",
};

export function modChartColor(m: string | null): string {
  return (m && MOD_CHART_COLOR[m]) || "#888888";
}

export function moduleShort(m: string | null): string {
  if (m === "speciales") return "SPÉC";
  if (m === "basique") return "BASE";
  if (m === "dry_fire") return "DRY";
  return moduleLabel(m).slice(0, 4).toUpperCase();
}

export function fmtDM(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function fmtSlash(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")} / ${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;
}

// accuracy sur 2 échelles : module_sessions 0-100, manual_sessions 0-1.
// Normalise vers 0-100 (aucune valeur réelle entre 0.95 et 64 → frontière sûre).
export function accuracyPct(a: number | null | undefined): number | null {
  if (a == null || Number.isNaN(a)) return null;
  return a <= 1.5 ? a * 100 : a;
}
