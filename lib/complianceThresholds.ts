// Seuils de conformité réglementaire — SOURCE UNIQUE. Fonctions pures, testables
// isolément. Ajuster un seuil = éditer ce fichier, rien d'autre.
//
// Références :
//  - FDO   : ≥ 3 séances validées ET ≥ 720 min (12 h) sur 12 mois glissants.
//  - Club  : ≥ 3 séances 'tir_controle' validées sur 12 mois (la vue agrégée ne
//            distinguant pas le type, tirControle12m est calculé côté page depuis
//            les entrées — cf. carnet/page.tsx).
//  - PIA-207 : pas de seuil en V1 → verdict N/A, compteurs bruts affichés.

import type { Regime } from "@/components/dashboard/rangeLog";

export type ComplianceVerdict = "conforme" | "non_conforme" | "na";

export interface ComplianceInput {
  regime: Regime;
  sessions12m: number;
  minutes12m: number;
  rounds12m: number;
  /** Séances 'tir_controle' validées sur 12 mois (seuil club). */
  tirControle12m: number;
}

export interface ComplianceResult {
  verdict: ComplianceVerdict;
  /** Libellé FR du verdict. */
  label: string;
  /** Texte FR du seuil applicable. */
  requirement: string;
}

export const THRESHOLDS = {
  fdo: { minSessions: 3, minMinutes: 720 },
  club: { minTirControle: 3 },
  pia207: null,
} as const;

const VERDICT_LABELS: Record<ComplianceVerdict, string> = {
  conforme: "Conforme",
  non_conforme: "Non conforme",
  na: "N/A",
};

/** Libellés FR des seuils par régime — SOURCE UNIQUE (UI + exports PDF). */
export const REQUIREMENT_LABELS: Record<Regime, string> = {
  fdo: "≥ 3 séances et ≥ 12 h / 12 mois",
  club: "≥ 3 tirs contrôlés / 12 mois",
  pia207: "Compteurs indicatifs (pas de seuil V1)",
};

export function evaluateCompliance(input: ComplianceInput): ComplianceResult {
  switch (input.regime) {
    case "fdo": {
      const ok =
        input.sessions12m >= THRESHOLDS.fdo.minSessions &&
        input.minutes12m >= THRESHOLDS.fdo.minMinutes;
      return {
        verdict: ok ? "conforme" : "non_conforme",
        label: VERDICT_LABELS[ok ? "conforme" : "non_conforme"],
        requirement: REQUIREMENT_LABELS.fdo,
      };
    }
    case "club": {
      const ok = input.tirControle12m >= THRESHOLDS.club.minTirControle;
      return {
        verdict: ok ? "conforme" : "non_conforme",
        label: VERDICT_LABELS[ok ? "conforme" : "non_conforme"],
        requirement: REQUIREMENT_LABELS.club,
      };
    }
    case "pia207":
    default:
      return {
        verdict: "na",
        label: VERDICT_LABELS.na,
        requirement: REQUIREMENT_LABELS.pia207,
      };
  }
}
