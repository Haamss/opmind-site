"use client";

import type { ReactNode } from "react";

/**
 * Erreurs métier levées en base (triggers / RPC SECURITY DEFINER) et le CTA
 * de montée en gamme associé.
 *
 * Seuls OM001 et OM002 sont traités ici. Les libellés affichés viennent
 * TOUJOURS de la base (message + hint de l'erreur PostgreSQL) : aucun texte
 * d'erreur n'est réécrit côté client, pour que le wording reste piloté par la
 * migration qui définit la règle.
 *
 *   OM001 — enforce_shooter_plan_limit : plafond de tireurs atteint.
 *   OM002 — validate_range_log_entry   : validation sans formule active.
 */

/**
 * Code d'erreur PostgreSQL porté par un rejet Supabase.
 *
 * PostgrestError étend bien Error (postgrest-js) et porte `code`/`hint`, mais
 * le type `Error` ne les déclare pas : après un `catch (e: unknown)`, un
 * `e instanceof Error` ne suffit donc pas à y accéder. Ce garde les lit sans
 * `as any` et renvoie null pour tout ce qui n'est pas une erreur Supabase.
 */
export function supabaseErrorCode(e: unknown): string | null {
  if (typeof e !== "object" || e === null) return null;
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/** Hint PostgreSQL, quand la règle en base en fournit un. */
export function supabaseErrorHint(e: unknown): string | null {
  if (typeof e !== "object" || e === null) return null;
  const hint = (e as { hint?: unknown }).hint;
  return typeof hint === "string" && hint.trim() ? hint : null;
}

/** Message porté par l'erreur, quelle que soit sa forme. */
export function supabaseErrorMessage(e: unknown): string | null {
  if (typeof e !== "object" || e === null) return null;
  const message = (e as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : null;
}

/**
 * Lien de paiement instructeur.
 *
 * Référence littérale à process.env : Next n'inline les variables
 * NEXT_PUBLIC_* au build que si elles sont écrites en toutes lettres. Renvoie
 * null si la variable est absente — on n'affiche alors aucun CTA plutôt qu'un
 * lien mort.
 */
export function instructorPaymentLink(): string | null {
  const url = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_INSTRUCTOR;
  return url && url.trim() ? url : null;
}

/**
 * CTA de montée en gamme. Ne rend rien si le lien n'est pas configuré.
 *
 * Les tokens du design system sont scopés sur `.page` (dashboard.module.css) :
 * ce composant est aussi monté depuis app/dashboard/layout.tsx, qui est hors
 * de cette portée. D'où les valeurs de repli sur chaque var().
 */
export function UpgradeCta({ label }: { label: string }) {
  const href = instructorPaymentLink();
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        alignSelf: "flex-start",
        fontFamily: 'var(--mono, "JetBrains Mono", monospace)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--red, #E84040)",
        border: "1px solid var(--red, #E84040)",
        padding: "7px 12px",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </a>
  );
}

/**
 * Rendu neutre d'une erreur métier : message et hint tels que la base les
 * renvoie, puis ce que l'appelant veut y ajouter (`children`).
 *
 * Ne suppose RIEN sur la nature de l'erreur : c'est à l'appelant de décider
 * si un CTA a du sens. Un plafond de formule en mérite un ; une erreur de
 * saisie comme OM006 (régime non déclaré) n'en mérite aucun.
 */
export function DbErrorNotice({
  error,
  children,
}: {
  error: unknown;
  children?: ReactNode;
}) {
  const message = supabaseErrorMessage(error);
  const hint = supabaseErrorHint(error);
  if (!message && !hint && !children) return null;
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        border: "1px solid var(--red, #E84040)",
        background: "rgba(232,64,64,0.08)",
        padding: "12px 14px",
      }}
    >
      {message && (
        <span
          style={{
            fontFamily: 'var(--mono, "JetBrains Mono", monospace)',
            fontSize: 11,
            lineHeight: 1.6,
            color: "var(--red, #E84040)",
          }}
        >
          {message}
        </span>
      )}
      {hint && (
        <span
          style={{
            fontFamily: 'var(--mono, "JetBrains Mono", monospace)',
            fontSize: 11,
            lineHeight: 1.6,
            color: "var(--dim, rgba(235,229,210,0.65))",
          }}
        >
          {hint}
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * Cas particulier : blocage de formule (OM001, OM002). Rendu neutre + CTA.
 * Renvoie null pour tout autre code — l'appelant garde alors son affichage
 * d'erreur habituel.
 */
export function PlanBlockedNotice({ error }: { error: unknown }) {
  const code = supabaseErrorCode(error);
  if (code !== "OM001" && code !== "OM002") return null;
  return (
    <DbErrorNotice error={error}>
      <UpgradeCta label="Passer au palier supérieur" />
    </DbErrorNotice>
  );
}
