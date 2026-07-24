"use client";

// Export PDF du carnet réglementaire — un document PAR régime, entrées
// VALIDÉES uniquement. Relevé signable par l'instructeur : identité, séances,
// zone signature. Jamais de verdict de conformité dans le document.
//
// PIA-207 : le tableau reprend le format officiel du Titre 3 du livret de
// certification et de suivi des tirs (colonnes ARMES | DATES | OBSERVATIONS),
// pour permettre la recopie directe dans le livret papier.

import jsPDF from "jspdf";
import type { Shooter } from "@/components/dashboard/types";
import {
  fmtDuration,
  regimeLabel,
  sessionTypeLabel,
  type RangeLogEntry,
  type Regime,
} from "@/components/dashboard/rangeLog";
import { REQUIREMENT_LABELS } from "@/lib/complianceThresholds";

const BORDEAUX: [number, number, number] = [122, 0, 0];
const BLACK: [number, number, number] = [0, 0, 0];
const GREY: [number, number, number] = [120, 120, 120];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_ZONE = 16;
const LINE_H = 4.2;
const CELL_PAD_X = 2;
const CELL_PAD_Y = 2.2;

/** Mention légale par régime — le relevé aide à tenir les registres
 *  officiels, il ne s'y substitue jamais. */
const LEGAL_MENTIONS: Record<Regime, string> = {
  pia207:
    "Relevé destiné à faciliter la tenue du livret de certification et de " +
    "suivi des tirs (PIA-207). Il ne se substitue pas à la pièce officielle " +
    "du dossier administratif, tenue par la formation d'appartenance.",
  fdo:
    "Relevé établi à titre de suivi individuel. Il ne se substitue pas aux " +
    "registres officiels de l'administration d'emploi.",
  club:
    "Relevé établi à titre de suivi individuel. Il ne se substitue pas au " +
    "registre de tir tenu par le club.",
};

export interface RangeLogPdfPayload {
  shooter: Shooter;
  regime: Regime;
  /** Entrées du carnet (tous régimes / tous statuts) : le filtre
   *  régime + validées est appliqué ici. */
  entries: RangeLogEntry[];
}

function fmtDateFR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
}

/** Ligne « Validé par … » figée au moment de la validation (snapshots RPC). */
function validatorLine(e: RangeLogEntry): string {
  const who = e.validator_name || "instructeur";
  const qual = e.validator_qualification ? ` (${e.validator_qualification})` : "";
  const when = e.validated_at ? ` le ${fmtDateFR(e.validated_at)}` : "";
  return `Validé par ${who}${qual}${when}`;
}

export function downloadRangeLogPdf(payload: RangeLogPdfPayload) {
  const { shooter, regime } = payload;
  const entries = payload.entries
    .filter((e) => e.regime === regime && e.validation_status === "validated")
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (entries.length === 0) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_X;

  const now = new Date();
  const today = now.toLocaleDateString("fr-FR");
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const docRef = `OPM-${regime.toUpperCase()}-${ymd}-${shooter.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  const setColor = (rgb: [number, number, number]) =>
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);

  const safeY = (needed: number): number => {
    if (y + needed > PAGE_H - MARGIN_X - FOOTER_ZONE) {
      doc.addPage();
      y = MARGIN_X;
    }
    return y;
  };

  const drawSeparator = (color: [number, number, number] = BORDEAUX) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 4;
  };

  /* ------------------------------ HEADER ------------------------------ */
  setColor(BORDEAUX);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("OPMIND", MARGIN_X, y);

  setColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(today, PAGE_W - MARGIN_X, y, { align: "right" });
  y += 6;

  setColor(BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RELEVÉ DE SÉANCES DE TIR", MARGIN_X, y);
  y += 5;
  drawSeparator();

  /* ---------------------------- IDENTITÉ ------------------------------ */
  const first = entries[0];
  const last = entries[entries.length - 1];
  const totalRounds = entries.reduce((s, e) => s + (e.rounds_fired ?? 0), 0);
  const totalMinutes = entries.reduce(
    (s, e) => s + (e.duration_minutes ?? 0),
    0
  );

  const meta: [string, string][] = [
    ["Tireur", shooter.name],
    ["Unité", shooter.unit || "—"],
    ["Grade", shooter.grade || "—"],
    ["Régime", regimeLabel(regime)],
    ["Période", `${fmtDateFR(first.date)} — ${fmtDateFR(last.date)}`],
    ["Séances validées", String(entries.length)],
    [
      "Totaux",
      `${totalRounds} cartouches · ${totalMinutes > 0 ? fmtDuration(totalMinutes) : "durée non renseignée"}`,
    ],
    // « ≥ » absent de la fonte helvetica jsPDF (WinAnsi) → « >= » dans le PDF.
    ["Seuil applicable", REQUIREMENT_LABELS[regime].replace(/≥/g, ">=")],
    ["Réf. document", docRef],
  ];

  doc.setFontSize(9);
  meta.forEach(([k, v]) => {
    safeY(5);
    setColor(GREY);
    doc.setFont("helvetica", "bold");
    doc.text(k.toUpperCase(), MARGIN_X, y);
    setColor(BLACK);
    doc.setFont("helvetica", "normal");
    doc.text(v, MARGIN_X + 38, y);
    y += 5;
  });
  y += 2;
  drawSeparator();

  /* ----------------------------- TABLEAU ------------------------------ */
  // PIA-207 : format officiel Titre 3 (ARMES | DATES | OBSERVATIONS).
  // FDO / club : colonnes détaillées adaptées aux registres civils/FDO.
  const isPia = regime === "pia207";
  const headers = isPia
    ? ["ARMES", "DATES", "OBSERVATIONS"]
    : ["DATE", "TYPE", "ARME", "MUN.", "DURÉE", "CALIBRE"];
  const widths = isPia ? [42, 26, 106] : [24, 42, 44, 20, 20, 24];
  const aligns: ("left" | "right")[] = isPia
    ? ["left", "left", "left"]
    : ["left", "left", "left", "right", "right", "left"];

  const colX: number[] = [];
  let acc = MARGIN_X;
  widths.forEach((w) => {
    colX.push(acc);
    acc += w;
  });

  const drawTableHeader = () => {
    const h = LINE_H + CELL_PAD_Y * 2;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    setColor(BLACK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    headers.forEach((label, i) => {
      doc.rect(colX[i], y, widths[i], h);
      const tx =
        aligns[i] === "right"
          ? colX[i] + widths[i] - CELL_PAD_X
          : colX[i] + CELL_PAD_X;
      doc.text(label, tx, y + CELL_PAD_Y + LINE_H - 1, {
        align: aligns[i] === "right" ? "right" : "left",
      });
    });
    y += h;
  };

  const drawRow = (cells: string[][]) => {
    const lineCount = Math.max(...cells.map((c) => c.length));
    const h = lineCount * LINE_H + CELL_PAD_Y * 2;
    if (y + h > PAGE_H - MARGIN_X - FOOTER_ZONE) {
      doc.addPage();
      y = MARGIN_X;
      drawTableHeader();
    }
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setColor(BLACK);
    cells.forEach((lines, i) => {
      doc.rect(colX[i], y, widths[i], h);
      const tx =
        aligns[i] === "right"
          ? colX[i] + widths[i] - CELL_PAD_X
          : colX[i] + CELL_PAD_X;
      lines.forEach((line, li) => {
        doc.text(line, tx, y + CELL_PAD_Y + (li + 1) * LINE_H - 1, {
          align: aligns[i] === "right" ? "right" : "left",
        });
      });
    });
    y += h;
  };

  const wrap = (text: string, width: number): string[] =>
    doc.splitTextToSize(text, width - CELL_PAD_X * 2) as string[];

  doc.setFontSize(8.5);
  safeY(30);
  drawTableHeader();

  entries.forEach((e) => {
    if (isPia) {
      // Observations au format constaté sur les livrets : type, score/notes
      // exclus, munitions, durée, calibre, lieu, puis validation (équivalent
      // numérique du tampon de l'autorité sur la ligne).
      const obsParts: string[] = [sessionTypeLabel(e.session_type)];
      obsParts.push(`${e.rounds_fired} cartouches`);
      if (e.duration_minutes) obsParts.push(fmtDuration(e.duration_minutes));
      if (e.caliber) obsParts.push(e.caliber);
      if (e.location) obsParts.push(e.location);
      const obs = [
        ...wrap(obsParts.join(" — "), widths[2]),
        ...wrap(validatorLine(e), widths[2]),
      ];
      drawRow([
        wrap(e.weapon_label || "—", widths[0]),
        wrap(fmtDateFR(e.date), widths[1]),
        obs,
      ]);
    } else {
      drawRow([
        wrap(fmtDateFR(e.date), widths[0]),
        wrap(sessionTypeLabel(e.session_type), widths[1]),
        wrap(e.weapon_label || "—", widths[2]),
        [String(e.rounds_fired)],
        [e.duration_minutes ? fmtDuration(e.duration_minutes) : "—"],
        wrap(e.caliber || "—", widths[5]),
      ]);
    }
  });

  // FDO / club : la validation n'apparaît pas ligne à ligne — attestation
  // globale sous le tableau.
  if (!isPia) {
    y += 4;
    safeY(10);
    setColor(GREY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    const attest = doc.splitTextToSize(
      "Toutes les séances listées ci-dessus ont été validées individuellement " +
        "par un instructeur via OpMind (horodatage et identité du validateur " +
        "conservés en base).",
      CONTENT_W
    ) as string[];
    attest.forEach((line) => {
      safeY(4);
      doc.text(line, MARGIN_X, y);
      y += 4;
    });
  }

  /* ------------------------ ZONE DE SIGNATURE -------------------------- */
  y += 6;
  safeY(58);
  setColor(BORDEAUX);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("VALIDATION DE L'AUTORITÉ", MARGIN_X, y);
  y += 6;

  setColor(BLACK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Fait à ..............................................., le ......... / ......... / ..................",
    MARGIN_X,
    y
  );
  y += 8;

  setColor(GREY);
  doc.setFontSize(8);
  doc.text("Nom, qualité et signature de l'autorité :", MARGIN_X, y);
  y += 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X, y, CONTENT_W, 28);
  y += 32;

  /* ------------------------- MENTION LÉGALE ---------------------------- */
  safeY(14);
  setColor(GREY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  const legal = doc.splitTextToSize(
    LEGAL_MENTIONS[regime],
    CONTENT_W
  ) as string[];
  legal.forEach((line) => {
    safeY(3.6);
    doc.text(line, MARGIN_X, y);
    y += 3.6;
  });

  /* --------------------------- PIED DE PAGE ---------------------------- */
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    setColor(GREY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(
      `Généré par OpMind — opmind.fr — ${today} — ${docRef}`,
      MARGIN_X,
      PAGE_H - 10
    );
    doc.text(`Page ${p} / ${pageCount}`, PAGE_W - MARGIN_X, PAGE_H - 10, {
      align: "right",
    });
  }

  const safeName =
    shooter.name.replace(/[^a-z0-9\-_ ]/gi, "_").slice(0, 30) || "tireur";
  doc.save(`opmind-carnet-${regime}-${safeName}.pdf`);
}
