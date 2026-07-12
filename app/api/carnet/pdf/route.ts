import { randomUUID } from "node:crypto";
import { getServerSupabase } from "@/lib/supabaseServer";
import { buildRangeLogPdf } from "@/lib/rangeLogPdf";
import type { RangeLogPdfEntry } from "@/lib/rangeLogPdf";
import type { Regime } from "@/components/dashboard/rangeLog";

// jspdf + node:crypto → runtime Node (pas Edge).
export const runtime = "nodejs";

// Les 3 régimes sont supportés — le template adapte mention légale, identité
// et seuil de référence par régime (voir lib/rangeLogPdf.ts REGIME_PDF).
const ALLOWED_REGIMES = ["pia207", "fdo", "club"] as const;

/** Réponse d'erreur lisible : le bouton fait un window.open, l'utilisateur voit
 *  le texte brut dans l'onglet → text/plain FR, jamais de JSON. */
function fail(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // 1) Whitelist régime stricte.
  const regime = url.searchParams.get("regime") ?? "pia207";
  if (!(ALLOWED_REGIMES as readonly string[]).includes(regime)) {
    return fail(
      400,
      "Régime non supporté pour l'export PDF — régimes disponibles : PIA-207, FDO, club."
    );
  }

  const instructorShooterId = url.searchParams.get("instructor_shooter_id");
  if (!instructorShooterId) {
    return fail(400, "Paramètre instructor_shooter_id manquant.");
  }

  // 2) Période (défaut : 12 mois glissants ; from/to ISO optionnels).
  const now = new Date();
  const toParam = url.searchParams.get("to");
  const fromParam = url.searchParams.get("from");
  const to = toParam ? new Date(toParam) : now;
  const from = fromParam ? new Date(fromParam) : new Date(now.getTime() - YEAR_MS);
  if (isNaN(to.getTime()) || isNaN(from.getTime())) {
    return fail(400, "Bornes de période invalides (from / to attendus en ISO).");
  }

  const sb = await getServerSupabase();

  // 3) Auth.
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return fail(401, "Session expirée — reconnecte-toi puis relance l'export.");
  }

  // 4) Lien instructeur↔tireur (RLS + contrôle explicite du propriétaire).
  const { data: shooterRow, error: sErr } = await sb
    .from("instructor_shooters")
    .select("id,instructor_id,shooter_id,name,grade,unit")
    .eq("id", instructorShooterId)
    .maybeSingle();
  if (sErr || !shooterRow || shooterRow.instructor_id !== user.id) {
    return fail(403, "Tireur non lié à votre compte — accès refusé.");
  }

  // 5) Entrées validées, régime demandé, période, tri chronologique ASC.
  //    Requête DIRECTE sur range_log_entries (jamais la vue). Double clé (D2).
  const orFilter = shooterRow.shooter_id
    ? `instructor_shooter_id.eq.${shooterRow.id},shooter_user_id.eq.${shooterRow.shooter_id}`
    : `instructor_shooter_id.eq.${shooterRow.id}`;
  const { data: rows, error: eErr } = await sb
    .from("range_log_entries")
    .select(
      "date,location,session_type,weapon_label,caliber,rounds_fired,duration_minutes,validator_name,validator_qualification,validated_at"
    )
    .or(orFilter)
    .eq("regime", regime)
    .eq("validation_status", "validated")
    .gte("date", from.toISOString())
    .lte("date", to.toISOString())
    .order("date", { ascending: true });
  if (eErr) {
    return fail(403, "Lecture du carnet refusée.");
  }
  const entries = (rows ?? []) as RangeLogPdfEntry[];
  if (entries.length === 0) {
    return fail(
      404,
      "Aucune entrée validée sur la période — aucun document généré."
    );
  }

  // 6) Identité : profiles si compte lié, sinon libellé instructor_shooters.
  let name = shooterRow.name || "—";
  if (shooterRow.shooter_id) {
    const { data: prof } = await sb
      .from("profiles")
      .select("first_name,last_name")
      .eq("id", shooterRow.shooter_id)
      .maybeSingle();
    const full = `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim();
    if (full) name = full;
  }

  const bytes = buildRangeLogPdf({
    regime: regime as Regime,
    documentId: randomUUID(),
    generatedAt: now.toISOString(),
    periodFrom: from.toISOString(),
    periodTo: to.toISOString(),
    identity: {
      name,
      grade: shooterRow.grade || "—",
      unit: shooterRow.unit || "—",
    },
    entries,
  });

  const filename = `releve-${regime}-${shooterRow.id}.pdf`;
  return new Response(new Blob([bytes], { type: "application/pdf" }), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
