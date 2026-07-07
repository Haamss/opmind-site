// Template PDF « Relevé individuel de tir — PIA-207 ». Présentation PURE : reçoit
// une identité + des entrées déjà filtrées (validated, régime, période) et rend
// un A4 français lisible en N&B via jspdf (tourne en Node). Aucun accès Supabase.
//
// Toutes les dates sont formatées JJ/MM/AAAA en Europe/Paris FORCÉ : le serveur
// tourne en UTC et `date` est un timestamptz — sans ça une séance de 23h le 06/07
// s'afficherait le 05/07.

import jsPDF from "jspdf";
import {
  REGIME_LABELS,
  sessionTypeLabel,
  fmtDuration,
  type Regime,
} from "@/components/dashboard/rangeLog";

const BORDEAUX: [number, number, number] = [122, 0, 0];
const BLACK: [number, number, number] = [0, 0, 0];
const GREY: [number, number, number] = [90, 90, 90];
const LIGHT: [number, number, number] = [175, 175, 175];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 15;
const CONTENT_W = PAGE_W - MARGIN_X * 2; // 180
const FOOTER_SPACE = 16;

const PARIS_DATE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** timestamptz ISO → JJ/MM/AAAA en Europe/Paris. null / invalide → « — ». */
function fmtParis(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return PARIS_DATE.format(d);
}

export interface RangeLogPdfIdentity {
  name: string;
  grade: string; // « — » si absent
  unit: string; // « — » si absent
}

export interface RangeLogPdfEntry {
  date: string;
  location: string | null;
  session_type: string | null;
  weapon_label: string | null;
  caliber: string | null;
  rounds_fired: number;
  duration_minutes: number | null;
  validator_name: string | null;
  validator_qualification: string | null;
  validated_at: string | null;
}

export interface RangeLogPdfData {
  regime: Regime;
  documentId: string;
  generatedAt: string; // ISO
  periodFrom: string; // ISO
  periodTo: string; // ISO
  identity: RangeLogPdfIdentity;
  entries: RangeLogPdfEntry[];
}

// Colonnes du tableau détaillé (mm). Somme = CONTENT_W.
const COLS: { key: string; label: string; w: number; align: "l" | "r" }[] = [
  { key: "date", label: "Date", w: 18, align: "l" },
  { key: "lieu", label: "Lieu", w: 22, align: "l" },
  { key: "type", label: "Type", w: 24, align: "l" },
  { key: "arme", label: "Arme", w: 26, align: "l" },
  { key: "cal", label: "Cal.", w: 14, align: "l" },
  { key: "cart", label: "Cart.", w: 12, align: "r" },
  { key: "duree", label: "Durée", w: 14, align: "r" },
  { key: "valpar", label: "Validé par", w: 34, align: "l" },
  { key: "valle", label: "Val. le", w: 16, align: "r" },
];

export function buildRangeLogPdf(data: RangeLogPdfData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_X;

  const setColor = (rgb: [number, number, number]) =>
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb: [number, number, number]) =>
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - FOOTER_SPACE) {
      doc.addPage();
      y = MARGIN_X;
    }
  };

  const genDate = fmtParis(data.generatedAt);

  /* ───────────── En-tête ───────────── */
  setColor(BORDEAUX);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("RELEVÉ INDIVIDUEL DE TIR", MARGIN_X, y);
  y += 6;
  setColor(BLACK);
  doc.setFontSize(11);
  doc.text(`Régime ${REGIME_LABELS[data.regime]}`, MARGIN_X, y);
  y += 5;

  setColor(GREY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    "Relevé d'appui signable — ne se substitue pas au carnet ISTC officiel.",
    MARGIN_X,
    y
  );
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(BLACK);
  const period = `${fmtParis(data.periodFrom)} → ${fmtParis(data.periodTo)}`;
  doc.text(`Période couverte : ${period}`, MARGIN_X, y);
  doc.text(`Généré le : ${genDate}`, PAGE_W - MARGIN_X, y, { align: "right" });
  y += 4;
  setColor(GREY);
  doc.setFontSize(7);
  doc.text(`ID document : ${data.documentId}`, MARGIN_X, y);
  y += 3;
  setDraw(BORDEAUX);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
  y += 6;

  /* ───────────── Identité tireur ───────────── */
  setColor(BORDEAUX);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("IDENTITÉ DU TIREUR", MARGIN_X, y);
  y += 5;
  const idRows: [string, string][] = [
    ["Nom", data.identity.name || "—"],
    ["Grade", data.identity.grade || "—"],
    ["Unité", data.identity.unit || "—"],
  ];
  doc.setFontSize(9);
  idRows.forEach(([k, v]) => {
    setColor(GREY);
    doc.setFont("helvetica", "bold");
    doc.text(k.toUpperCase(), MARGIN_X, y);
    setColor(BLACK);
    doc.setFont("helvetica", "normal");
    doc.text(v, MARGIN_X + 30, y);
    y += 5;
  });
  y += 3;

  /* ───────────── Compteurs (aucun verdict) ───────────── */
  const byType = new Map<string, { n: number; rounds: number }>();
  const byWeapon = new Map<string, { n: number; rounds: number }>();
  let totalRounds = 0;
  for (const e of data.entries) {
    const tKey = e.session_type ?? "—";
    const t = byType.get(tKey) ?? { n: 0, rounds: 0 };
    t.n += 1;
    t.rounds += e.rounds_fired ?? 0;
    byType.set(tKey, t);

    const wKey = `${e.weapon_label || "—"} / ${e.caliber || "—"}`;
    const w = byWeapon.get(wKey) ?? { n: 0, rounds: 0 };
    w.n += 1;
    w.rounds += e.rounds_fired ?? 0;
    byWeapon.set(wKey, w);

    totalRounds += e.rounds_fired ?? 0;
  }

  const counterBlock = (
    title: string,
    rows: { label: string; n: number; rounds: number }[]
  ) => {
    ensure(8 + rows.length * 4.5);
    setColor(BORDEAUX);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, MARGIN_X, y);
    y += 5;
    setColor(BLACK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    rows.forEach((r) => {
      ensure(4.5);
      const s = r.n > 1 ? "séances" : "séance";
      doc.text(`${r.label}`, MARGIN_X + 2, y);
      doc.text(
        `${r.n} ${s} · ${r.rounds} cart.`,
        PAGE_W - MARGIN_X,
        y,
        { align: "right" }
      );
      y += 4.5;
    });
    y += 3;
  };

  counterBlock(
    "COMPTEURS PAR TYPE DE SÉANCE",
    Array.from(byType.entries()).map(([k, v]) => ({
      label: sessionTypeLabel(k),
      n: v.n,
      rounds: v.rounds,
    }))
  );
  counterBlock(
    "COMPTEURS PAR ARME / CALIBRE",
    Array.from(byWeapon.entries()).map(([k, v]) => ({
      label: k,
      n: v.n,
      rounds: v.rounds,
    }))
  );

  setColor(BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  ensure(6);
  doc.text(
    `Total : ${data.entries.length} séance(s) validée(s) · ${totalRounds} cartouches`,
    MARGIN_X,
    y
  );
  y += 6;

  /* ───────────── Tableau détaillé ───────────── */
  const drawTableHeader = () => {
    setDraw(LIGHT);
    doc.setLineWidth(0.2);
    setColor(BORDEAUX);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    let x = MARGIN_X;
    for (const c of COLS) {
      if (c.align === "r") doc.text(c.label, x + c.w - 1, y, { align: "right" });
      else doc.text(c.label, x + 1, y);
      x += c.w;
    }
    y += 2;
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 3;
  };

  ensure(14);
  setColor(BORDEAUX);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DÉTAIL DES SÉANCES", MARGIN_X, y);
  y += 5;
  drawTableHeader();

  const LINE_H = 3.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (const e of data.entries) {
    const valPar =
      (e.validator_name || "—") +
      (e.validator_qualification ? ` (${e.validator_qualification})` : "");
    const cells: Record<string, string> = {
      date: fmtParis(e.date),
      lieu: e.location || "—",
      type: sessionTypeLabel(e.session_type),
      arme: e.weapon_label || "—",
      cal: e.caliber || "—",
      cart: String(e.rounds_fired ?? 0),
      duree: fmtDuration(e.duration_minutes),
      valpar: valPar,
      valle: fmtParis(e.validated_at),
    };
    // Wrap par cellule, hauteur de ligne = max lignes.
    const wrapped: Record<string, string[]> = {};
    let maxLines = 1;
    for (const c of COLS) {
      const lines = doc.splitTextToSize(cells[c.key], c.w - 2) as string[];
      wrapped[c.key] = lines.length ? lines : ["—"];
      if (wrapped[c.key].length > maxLines) maxLines = wrapped[c.key].length;
    }
    const rowH = maxLines * LINE_H + 2;
    if (y + rowH > PAGE_H - FOOTER_SPACE) {
      doc.addPage();
      y = MARGIN_X;
      setColor(BORDEAUX);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("DÉTAIL DES SÉANCES (suite)", MARGIN_X, y);
      y += 5;
      drawTableHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
    }
    setColor(BLACK);
    let x = MARGIN_X;
    for (const c of COLS) {
      const lines = wrapped[c.key];
      lines.forEach((ln, i) => {
        const ty = y + i * LINE_H;
        if (c.align === "r") doc.text(ln, x + c.w - 1, ty, { align: "right" });
        else doc.text(ln, x + 1, ty);
      });
      x += c.w;
    }
    y += rowH;
    setDraw([230, 230, 230]);
    doc.setLineWidth(0.1);
    doc.line(MARGIN_X, y - 1.5, PAGE_W - MARGIN_X, y - 1.5);
  }
  y += 4;

  /* ───────────── Zone signature manuscrite ───────────── */
  const SIG_H = 40;
  if (y + SIG_H > PAGE_H - FOOTER_SPACE) {
    doc.addPage();
    y = MARGIN_X;
  }
  setColor(BORDEAUX);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VALIDATION MANUSCRITE", MARGIN_X, y);
  y += 4;
  setDraw(GREY);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X, y, CONTENT_W, SIG_H - 6);
  setColor(BLACK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const sy = y + 7;
  doc.text("Nom / Qualité :", MARGIN_X + 4, sy);
  doc.text("Date :", MARGIN_X + 4, sy + 10);
  doc.text("Signature / Tampon :", PAGE_W / 2 + 4, sy);
  y += SIG_H;

  /* ───────────── Pied de page (toutes pages) ───────────── */
  const pageCount = doc.getNumberOfPages();
  const footer = `Document généré par OpMind le ${genDate} à partir de ${data.entries.length} entrées validées et verrouillées — ID ${data.documentId}`;
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    setColor(GREY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const lines = doc.splitTextToSize(footer, CONTENT_W - 20) as string[];
    let fy = PAGE_H - 10;
    lines.forEach((ln) => {
      doc.text(ln, MARGIN_X, fy);
      fy += 3;
    });
    doc.text(`Page ${p} / ${pageCount}`, PAGE_W - MARGIN_X, PAGE_H - 10, {
      align: "right",
    });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
