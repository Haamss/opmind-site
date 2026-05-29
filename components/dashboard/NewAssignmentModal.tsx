"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { AssignmentType, ModuleKind } from "./types";

interface Props {
  shooterId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TYPES: { v: AssignmentType; l: string }[] = [
  { v: "module", l: "Module" },
  { v: "carnet", l: "Carnet" },
  { v: "free", l: "Libre" },
];

const MODULE_KINDS: { v: ModuleKind; l: string }[] = [
  { v: "basique", l: "Basique" },
  { v: "dry_fire", l: "Dry Fire" },
  { v: "speciales", l: "Spéciales" },
  { v: "vector", l: "Vector" },
  { v: "shot_timer", l: "Shot Timer" },
  { v: "stages", l: "Stages" },
  { v: "degrade", l: "Dégradé" },
];

export function NewAssignmentModal({ shooterId, open, onClose, onCreated }: Props) {
  const [type, setType] = useState<AssignmentType>("module");
  const [moduleKind, setModuleKind] = useState<ModuleKind>("basique");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType("module");
      setModuleKind("basique");
      setTitle("");
      setDescription("");
      setDeadline("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: {
        instructor_shooter_id: string;
        type: AssignmentType;
        title: string;
        description: string | null;
        deadline: string | null;
        status: "pending";
        module_kind?: ModuleKind;
      } = {
        instructor_shooter_id: shooterId,
        type,
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        status: "pending",
      };
      if (type === "module") payload.module_kind = moduleKind;

      const { error: insertError } = await getSupabase()
        .from("instructor_assignments")
        .insert(payload);
      if (insertError) throw insertError;
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
      <div className="w-full max-w-lg border border-[#1A1A1A] bg-[#0A0A0A]">
        <div className="flex items-center justify-between border-b border-[#1A1A1A] px-6 py-4">
          <h3 className="font-mono text-base font-bold uppercase tracking-[0.18em] text-white">
            Nouvelle assignation
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
          <Field label="Type">
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setType(t.v)}
                  className={`border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    type === t.v
                      ? "border-[#7A0000] bg-[#7A0000] text-white"
                      : "border-[#1A1A1A] text-[#888] hover:border-[#333] hover:text-white"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </Field>

          {type === "module" && (
            <Field label="Module">
              <div className="flex flex-wrap gap-2">
                {MODULE_KINDS.map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    onClick={() => setModuleKind(m.v)}
                    className={`border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                      moduleKind === m.v
                        ? "border-[#7A0000] bg-[#7A0000] text-white"
                        : "border-[#1A1A1A] text-[#888] hover:border-[#333] hover:text-white"
                    }`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label="Titre">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
              className="w-full border border-[#1A1A1A] bg-black px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors focus:border-[#7A0000]"
              placeholder="Ex. Drill de précision à 25m"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none border border-[#1A1A1A] bg-black px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors focus:border-[#7A0000]"
              placeholder="Consigne, objectif, distance, contraintes…"
            />
          </Field>

          <Field label="Deadline">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full border border-[#1A1A1A] bg-black px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors focus:border-[#7A0000]"
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
              {submitting ? "Création…" : "Créer"}
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
