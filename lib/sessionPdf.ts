"use client";

import jsPDF from "jspdf";
import type { SessionContent } from "@/components/dashboard/types";

const BORDEAUX: [number, number, number] = [122, 0, 0];
const BLACK: [number, number, number] = [0, 0, 0];
const GREY: [number, number, number] = [120, 120, 120];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

export interface SessionPdfPayload {
  title: string;
  type: string;
  module_kind: string | null;
  deadline: string | null;
  shooter_name: string;
  instructor_name: string;
  content: SessionContent;
}

export function downloadSessionPdf(payload: SessionPdfPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_X;

  const safeY = (needed: number): number => {
    if (y + needed > PAGE_H - MARGIN_X) {
      doc.addPage();
      y = MARGIN_X;
    }
    return y;
  };

  const setColor = (rgb: [number, number, number]) =>
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);

  const drawSeparator = (color: [number, number, number] = BORDEAUX) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 4;
  };

  // ---- HEADER ----
  setColor(BORDEAUX);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("OPMIND", MARGIN_X, y);

  setColor(GREY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const today = new Date().toLocaleDateString("fr-FR");
  doc.text(today, PAGE_W - MARGIN_X, y, { align: "right" });
  y += 6;

  setColor(BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("FICHE DE SÉANCE", MARGIN_X, y);
  y += 5;
  drawSeparator();

  // ---- TITLE ----
  setColor(BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(payload.title, CONTENT_W) as string[];
  safeY(titleLines.length * 6);
  doc.text(titleLines, MARGIN_X, y);
  y += titleLines.length * 6 + 2;

  // ---- META BLOCK ----
  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const moduleLabel = (k: string | null) => {
    if (!k) return "";
    const m: Record<string, string> = {
      basique: "Basique",
      dry_fire: "Dry Fire",
      speciales: "Spéciales",
      vector: "Vector",
    };
    return m[k] ?? k;
  };

  const typeLabel = payload.type.charAt(0).toUpperCase() + payload.type.slice(1);
  const meta: [string, string][] = [
    ["Tireur", payload.shooter_name],
    ["Instructeur", payload.instructor_name],
    ["Type", typeLabel + (payload.module_kind ? ` — ${moduleLabel(payload.module_kind)}` : "")],
    ["Date limite", formatDate(payload.deadline)],
    ["Durée estimée", payload.content.duree_estimee || "—"],
  ];

  doc.setFontSize(9);
  meta.forEach(([k, v]) => {
    safeY(5);
    setColor(GREY);
    doc.setFont("helvetica", "bold");
    doc.text(k.toUpperCase(), MARGIN_X, y);
    setColor(BLACK);
    doc.setFont("helvetica", "normal");
    doc.text(v, MARGIN_X + 35, y);
    y += 5;
  });
  y += 2;
  drawSeparator();

  // ---- SECTION renderer ----
  const renderSection = (
    title: string,
    body: string,
    opts: { allowEmpty?: boolean } = {}
  ) => {
    if (!body.trim() && !opts.allowEmpty) return;
    safeY(10);
    setColor(BORDEAUX);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), MARGIN_X, y);
    y += 5;

    setColor(BLACK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(body || "—", CONTENT_W) as string[];
    lines.forEach((line) => {
      safeY(5);
      doc.text(line, MARGIN_X, y);
      y += 5;
    });
    y += 3;
  };

  // ---- OBJECTIFS ----
  renderSection("Objectifs", payload.content.objectifs);

  // ---- EXERCICES ----
  if (payload.content.exercices.length > 0) {
    safeY(10);
    setColor(BORDEAUX);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("EXERCICES", MARGIN_X, y);
    y += 5;

    payload.content.exercices.forEach((ex, i) => {
      const num = `${i + 1}.`;
      safeY(8);

      setColor(BLACK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(num, MARGIN_X, y);
      doc.text(ex.titre || "(sans titre)", MARGIN_X + 7, y);
      y += 5;

      const parts: string[] = [];
      if (ex.repetitions !== null && ex.repetitions !== undefined) parts.push(`${ex.repetitions} rep.`);
      if (ex.distance) parts.push(ex.distance);
      if (ex.cible) parts.push(`Cible ${ex.cible}`);
      if (parts.length > 0) {
        setColor(GREY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        safeY(5);
        doc.text(parts.join("  ·  "), MARGIN_X + 7, y);
        y += 4;
      }

      if (ex.consignes.trim()) {
        setColor(BLACK);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const consLines = doc.splitTextToSize(ex.consignes, CONTENT_W - 7) as string[];
        consLines.forEach((line) => {
          safeY(5);
          doc.text(line, MARGIN_X + 7, y);
          y += 5;
        });
      }
      y += 2;
    });
    y += 1;
  }

  renderSection("Consignes générales", payload.content.consignes_generales);
  renderSection("Matériel requis", payload.content.materiel);

  // ---- FOOTER on every page ----
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    setColor(GREY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Généré par OpMind — opmind.fr — ${today}`, MARGIN_X, PAGE_H - 10);
    doc.text(`Page ${p} / ${pageCount}`, PAGE_W - MARGIN_X, PAGE_H - 10, { align: "right" });
  }

  const safeTitle = payload.title.replace(/[^a-z0-9\-_ ]/gi, "_").slice(0, 40) || "seance";
  doc.save(`opmind-${safeTitle}.pdf`);
}

export function summarizeSession(content: SessionContent): string {
  const parts: string[] = [];
  if (content.duree_estimee) parts.push(`Durée : ${content.duree_estimee}`);
  if (content.exercices.length > 0) {
    const exLines = content.exercices.map((ex, i) => {
      const meta: string[] = [];
      if (ex.repetitions !== null && ex.repetitions !== undefined) meta.push(`${ex.repetitions} rep.`);
      if (ex.distance) meta.push(ex.distance);
      if (ex.cible) meta.push(`cible ${ex.cible}`);
      return `${i + 1}. ${ex.titre || "(sans titre)"}${meta.length > 0 ? ` — ${meta.join(", ")}` : ""}`;
    });
    parts.push(`Exercices :\n${exLines.join("\n")}`);
  }
  if (content.objectifs.trim()) parts.push(`Objectifs : ${content.objectifs.trim()}`);
  return parts.join("\n\n").slice(0, 1500);
}
