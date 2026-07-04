"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import styles from "@/components/dashboard/dashboard.module.css";
import { Breadcrumb, EmptyState } from "@/components/dashboard/ui";
import { formatDate } from "@/components/dashboard/data";
import type { Shooter } from "@/components/dashboard/types";
import {
  fetchRangeLogEntries,
  fetchRangeLogCompliance,
  validateRangeLogEntry,
  regimeLabel,
  sessionTypeLabel,
  fmtDuration,
  REGIME_LABELS,
  VALIDATION_LABELS,
  type RangeLogEntry,
  type RegimeCompliance,
  type Regime,
  type ValidationStatus,
} from "@/components/dashboard/rangeLog";

/* ────────────────────────────── Tokens ───────────────────────────────── */

const REGIME_COLOR: Record<Regime, string> = {
  pia207: "#5ad99b",
  fdo: "#4D8AFF",
  club: "#FFB300",
};
const STATUS_COLOR: Record<ValidationStatus, string> = {
  draft: "#888888",
  pending: "#FFB300",
  validated: "#5ad99b",
  rejected: "#E84040",
};

// Date · Régime · Type · Munitions · Durée · Arme · Statut
const CARNET_COLS = "96px 130px minmax(0,1fr) 90px 80px minmax(0,1fr) 110px";

/* ────────────────────────────── Page ─────────────────────────────────── */

export default function CarnetPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-10 font-mono text-xs uppercase tracking-[0.22em] text-[#666]">
          Chargement…
        </div>
      }
    >
      <CarnetDetail />
    </Suspense>
  );
}

function CarnetDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");

  const [shooter, setShooter] = useState<Shooter | null>(null);
  const [entries, setEntries] = useState<RangeLogEntry[]>([]);
  const [compliance, setCompliance] = useState<RegimeCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const { data: row, error: sErr } = await sb
        .from("instructor_shooters")
        .select(
          "id,instructor_id,shooter_id,name,unit,grade,specialite,instructor_notes,status,linked_at,invite_code,invite_status"
        )
        .eq("id", id)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!row) {
        setError("Tireur introuvable");
        setShooter(null);
        setEntries([]);
        setCompliance([]);
        return;
      }
      const s = row as Shooter;
      const [ent, comp] = await Promise.all([
        fetchRangeLogEntries(s),
        fetchRangeLogCompliance(s),
      ]);
      setShooter(s);
      setEntries(ent);
      setCompliance(comp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const onValidate = useCallback(
    async (entry: RangeLogEntry, action: "validate" | "reject") => {
      setBusyId(entry.id);
      setActionError(null);
      try {
        const note = noteById[entry.id]?.trim();
        await validateRangeLogEntry(entry.id, action, note || undefined);
        await load();
      } catch (e) {
        setActionError(
          `Action impossible : ${
            e instanceof Error ? e.message : "erreur inconnue"
          }`
        );
      } finally {
        setBusyId(null);
      }
    },
    [noteById, load]
  );

  if (!id) {
    return (
      <div className="px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#E84040]">
          ID de tireur manquant
        </p>
        <Link
          href="/dashboard/mes-tireurs"
          className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.22em] text-[#888] hover:text-white"
        >
          ← Retour
        </Link>
      </div>
    );
  }

  return (
    <div className={`${styles.page} px-6 py-8 md:px-10 md:py-10`}>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Mes Tireurs", href: "/dashboard/mes-tireurs" },
          { label: shooter?.name ?? "…", href: `/dashboard/shooter?id=${id}` },
          { label: "Carnet" },
        ]}
      />

      <button
        type="button"
        onClick={() => router.push(`/dashboard/shooter?id=${id}`)}
        className={styles["back-link"]}
      >
        <svg viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Retour à la fiche
      </button>

      {error && (
        <div className="mb-6 border border-[#E84040]/50 bg-[#E84040]/[0.08] px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-[#E84040]">
          {error}
        </div>
      )}

      {loading && !shooter ? (
        <EmptyState>Chargement…</EmptyState>
      ) : !shooter ? null : (
        <>
          {/* HEADER */}
          <div className={styles["page-head"]}>
            <div>
              <div className={styles.eyebrow}>Module · Carnet réglementaire</div>
              <h1 className={styles.title}>{shooter.name}</h1>
              <div className={styles["title-sub"]}>
                Registre des séances réglementaires · validation instructeur
              </div>
            </div>
          </div>

          {/* CONFORMITÉ — compteurs bruts (verdict branché au commit suivant) */}
          <ComplianceStrip compliance={compliance} />

          {/* SÉANCES */}
          <div className={styles["section-head"]}>
            <h2>
              <span className={styles.num}>01</span> Séances{" "}
              <em>réglementaires.</em>
            </h2>
            <div className={styles.meta}>{entries.length} entrées</div>
          </div>

          {actionError && (
            <div className="mb-4 border border-[#E84040]/50 bg-[#E84040]/[0.08] px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-[#E84040]">
              {actionError}
            </div>
          )}

          {entries.length === 0 ? (
            <div
              className={styles.panel}
              style={{ marginBottom: 32, padding: 24 }}
            >
              <EmptyState>Aucune séance au carnet</EmptyState>
            </div>
          ) : (
            <div className={styles.panel} style={{ marginBottom: 32 }}>
              <div
                className={styles["st-head"]}
                style={{ gridTemplateColumns: CARNET_COLS }}
              >
                <span>Date</span>
                <span>Régime</span>
                <span>Type</span>
                <span style={{ textAlign: "right" }}>Munitions</span>
                <span style={{ textAlign: "right" }}>Durée</span>
                <span>Arme</span>
                <span>Statut</span>
              </div>
              {entries.map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  note={noteById[e.id] ?? ""}
                  onNote={(v) =>
                    setNoteById((m) => ({ ...m, [e.id]: v }))
                  }
                  busy={busyId === e.id}
                  onAction={(a) => onValidate(e, a)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ────────────────────────── Conformité (compteurs) ───────────────────── */

function ComplianceStrip({ compliance }: { compliance: RegimeCompliance[] }) {
  const regimes = Object.keys(REGIME_LABELS) as Regime[];
  return (
    <div className={styles["kpi-grid"]} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
      {regimes.map((r) => {
        const c = compliance.find((x) => x.regime === r);
        const sessions = c?.validated_sessions_12m ?? 0;
        const hours = Math.round((c?.validated_minutes_12m ?? 0) / 60);
        const rounds = c?.validated_rounds_12m ?? 0;
        return (
          <div key={r} className={styles.kpi}>
            <div className={styles["kpi-head"]}>
              <span className={styles["kpi-l"]}>{REGIME_LABELS[r]}</span>
              <span
                className={`${styles["kpi-badge"]} ${styles.flat}`}
                style={{ color: REGIME_COLOR[r], borderColor: REGIME_COLOR[r] }}
              >
                12 mois
              </span>
            </div>
            <span className={styles["kpi-v"]} style={{ fontSize: 34 }}>
              {sessions}
              <span className={styles.unit}> séances</span>
            </span>
            <span className={styles["kpi-sub"]}>
              {hours} h · {rounds} cartouches (validées)
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────── Ligne ──────────────────────────────── */

function EntryRow({
  entry: e,
  note,
  onNote,
  busy,
  onAction,
}: {
  entry: RangeLogEntry;
  note: string;
  onNote: (v: string) => void;
  busy: boolean;
  onAction: (a: "validate" | "reject") => void;
}) {
  const locked = e.validation_status === "validated";
  return (
    <div
      style={{
        borderBottom: "1px solid var(--line)",
        padding: "2px 0",
      }}
    >
      <div
        className={styles["st-row"]}
        style={{ gridTemplateColumns: CARNET_COLS, cursor: "default" }}
      >
        <span className={styles.date}>{formatDate(e.date)}</span>
        <span>
          <Badge color={REGIME_COLOR[e.regime]}>{regimeLabel(e.regime)}</Badge>
        </span>
        <span className={styles.nm} style={{ minWidth: 0 }}>
          {sessionTypeLabel(e.session_type)}
          {e.location && <span className={styles.s}>{e.location}</span>}
        </span>
        <span className={styles.num} style={{ textAlign: "right" }}>
          {e.rounds_fired}
        </span>
        <span className={styles.num} style={{ textAlign: "right" }}>
          {fmtDuration(e.duration_minutes)}
        </span>
        <span
          className={styles.nm}
          style={{ minWidth: 0, fontWeight: 400, textTransform: "none" }}
        >
          {e.weapon_label || "—"}
        </span>
        <span>
          <Badge color={STATUS_COLOR[e.validation_status]}>
            {locked ? "🔒 " : ""}
            {VALIDATION_LABELS[e.validation_status]}
          </Badge>
        </span>
      </div>

      {/* Verrou : entrée validée = immuable, aucune action */}
      {locked && (
        <div
          style={{
            padding: "0 16px 12px",
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--dim)",
          }}
        >
          Validée par{" "}
          <strong style={{ color: "var(--ink)" }}>
            {e.validator_name || "—"}
          </strong>
          {e.validator_qualification ? ` · ${e.validator_qualification}` : ""}
          {e.validated_at ? ` · ${formatDate(e.validated_at)}` : ""}
        </div>
      )}

      {/* Motif de rejet éventuel */}
      {e.validation_status === "rejected" && e.validation_note && (
        <div
          style={{
            padding: "0 16px 12px",
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--dim)",
          }}
        >
          Motif : <span style={{ color: "var(--ink)" }}>{e.validation_note}</span>
        </div>
      )}

      {/* Actions de validation : sur pending uniquement (D1) */}
      {e.validation_status === "pending" && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "0 16px 14px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            value={note}
            onChange={(ev) => onNote(ev.target.value)}
            placeholder="Note de validation (optionnelle)"
            disabled={busy}
            style={{
              flex: 1,
              minWidth: 180,
              background: "var(--bg)",
              border: "1px solid var(--line-2)",
              color: "var(--ink)",
              padding: "8px 12px",
              fontFamily: "var(--mono)",
              fontSize: 12,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => onAction("validate")}
            disabled={busy}
            className={styles["btn-mini"]}
            style={{
              borderColor: "var(--green)",
              color: "var(--green)",
              opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? "…" : "Valider"}
          </button>
          <button
            type="button"
            onClick={() => onAction("reject")}
            disabled={busy}
            className={styles["btn-mini"]}
            style={{
              borderColor: "var(--red)",
              color: "var(--red)",
              opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? "…" : "Rejeter"}
          </button>
        </div>
      )}
    </div>
  );
}

function Badge({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={styles.badge}
      style={{ color, borderColor: color, justifySelf: "start" }}
    >
      {children}
    </span>
  );
}
