"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Shooter } from "./types";
import {
  insertRangeLogEntry,
  REGIME_LABELS,
  REGIME_OPTIONS,
  SESSION_TYPE_LABELS,
  SESSION_TYPE_OPTIONS,
  type RangeLogDraft,
  type Regime,
} from "./rangeLog";

interface Props {
  shooter: Shooter;
  onClose: () => void;
  onCreated: () => void;
}

const inputCls =
  "w-full border border-[#1A1A1A] bg-black px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors focus:border-[#7A0000]";

/** datetime-local pré-rempli à maintenant (heure locale). */
function nowLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

export function RangeLogForm({ shooter, onClose, onCreated }: Props) {
  const [date, setDate] = useState<string>(() => nowLocal());
  const [regime, setRegime] = useState<Regime>("pia207");
  const [sessionType, setSessionType] = useState<string>("tir_controle");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [rounds, setRounds] = useState("0");
  const [caliber, setCaliber] = useState("");
  const [weaponLabel, setWeaponLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!date) {
      setError("La date est requise");
      return;
    }
    const roundsN = rounds === "" ? 0 : Number(rounds);
    if (!Number.isFinite(roundsN) || roundsN < 0) {
      setError("Le nombre de munitions doit être positif");
      return;
    }
    const durationN =
      duration === "" ? null : Math.max(0, Math.round(Number(duration)));
    setSubmitting(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await getSupabase().auth.getSession();
      const createdBy = session?.user.id;
      if (!createdBy) throw new Error("Session expirée, reconnecte-toi");

      const draft: RangeLogDraft = {
        date: new Date(date).toISOString(),
        regime,
        session_type: sessionType || null,
        location: location.trim() || null,
        duration_minutes: durationN,
        rounds_fired: roundsN,
        caliber: caliber.trim() || null,
        weapon_label: weaponLabel.trim() || null,
        notes: notes.trim() || null,
      };
      await insertRangeLogEntry(shooter, createdBy, draft);
      onCreated();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erreur lors de l'enregistrement"
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-[#1A1A1A] bg-[#0A0A0A]">
        <div className="flex items-center justify-between border-b border-[#1A1A1A] px-6 py-4">
          <h3 className="font-mono text-base font-bold uppercase tracking-[0.18em] text-white">
            Saisir une séance
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#888] transition-colors hover:text-white"
          >
            Fermer
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#666]">
            Pour {shooter.name} · enregistrée « en attente », à valider ensuite.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Date & heure *">
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Régime *">
              <select
                value={regime}
                onChange={(e) => setRegime(e.target.value as Regime)}
                className={inputCls}
              >
                {REGIME_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {REGIME_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Type de séance">
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {SESSION_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {SESSION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Lieu">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={120}
                className={inputCls}
                placeholder="Ex. Stand 25m"
              />
            </Field>

            <Field label="Munitions tirées *">
              <input
                type="number"
                min={0}
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
                className={inputCls}
                placeholder="0"
              />
            </Field>

            <Field label="Durée (min)">
              <input
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={inputCls}
                placeholder="Ex. 90"
              />
            </Field>

            <Field label="Calibre">
              <input
                type="text"
                value={caliber}
                onChange={(e) => setCaliber(e.target.value)}
                maxLength={40}
                className={inputCls}
                placeholder="Ex. 9x19"
              />
            </Field>

            <Field label="Arme (dotation)">
              <input
                type="text"
                value={weaponLabel}
                onChange={(e) => setWeaponLabel(e.target.value)}
                maxLength={80}
                className={inputCls}
                placeholder="Ex. Glock 17 · dotation"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${inputCls} resize-y`}
              placeholder="Contexte, exercices, observations."
            />
          </Field>

          {error && (
            <div className="border border-[#E84040]/50 bg-[#E84040]/[0.08] px-3 py-2 font-mono text-xs text-[#E84040]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[#1A1A1A] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="border border-[#1A1A1A] bg-transparent px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#888] transition-colors hover:border-[#333] hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="border border-[#7A0000] bg-[#7A0000] px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#9A0000] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#888]">
        {label}
      </span>
      {children}
    </label>
  );
}
