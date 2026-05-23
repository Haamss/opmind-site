"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { downloadSessionPdf, summarizeSession } from "@/lib/sessionPdf";
import type {
  AssignmentType,
  ModuleKind,
  SessionContent,
  SessionExercise,
  Shooter,
  TargetKind,
} from "@/components/dashboard/types";

const TARGETS: TargetKind[] = ["TSV", "Précision", "Plaques", "Autre"];

const emptyExercise: SessionExercise = {
  titre: "",
  consignes: "",
  repetitions: null,
  distance: "",
  cible: "",
};

const emptyContent: SessionContent = {
  objectifs: "",
  exercices: [{ ...emptyExercise }],
  consignes_generales: "",
  materiel: "",
  duree_estimee: "",
  notes_instructeur: "",
};

export default function SessionNewPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-10 font-mono text-xs uppercase tracking-[0.22em] text-[#666]">
          Chargement…
        </div>
      }
    >
      <SessionCreator />
    </Suspense>
  );
}

function SessionCreator() {
  const router = useRouter();
  const params = useSearchParams();
  const shooterId = params.get("id");

  const [shooter, setShooter] = useState<Shooter | null>(null);
  const [instructorName, setInstructorName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssignmentType>("module");
  const [moduleKind, setModuleKind] = useState<ModuleKind>("basique");
  const [deadline, setDeadline] = useState("");
  const [content, setContent] = useState<SessionContent>({ ...emptyContent });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shooterId) {
        setLoading(false);
        setError("ID de tireur manquant");
        return;
      }
      try {
        const sb = getSupabase();
        const [{ data: s, error: sErr }, { data: sess }] = await Promise.all([
          sb
            .from("instructor_shooters")
            .select(
              "id,instructor_id,shooter_id,name,unit,grade,specialite,instructor_notes,status,linked_at"
            )
            .eq("id", shooterId)
            .maybeSingle(),
          sb.auth.getSession(),
        ]);
        if (sErr) throw sErr;

        let pseudo = sess?.session?.user.email ?? "";
        const uid = sess?.session?.user.id;
        if (uid) {
          const { data: prof } = await sb
            .from("profiles")
            .select("pseudo")
            .eq("id", uid)
            .maybeSingle();
          if (prof?.pseudo) pseudo = prof.pseudo;
        }

        if (cancelled) return;
        setShooter((s as Shooter) ?? null);
        setInstructorName(pseudo);
        if (!s) setError("Tireur introuvable");
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shooterId]);

  const updateExercise = useCallback(
    (index: number, patch: Partial<SessionExercise>) => {
      setContent((c) => ({
        ...c,
        exercices: c.exercices.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
      }));
    },
    []
  );

  const addExercise = useCallback(() => {
    setContent((c) => ({ ...c, exercices: [...c.exercices, { ...emptyExercise }] }));
  }, []);

  const removeExercise = useCallback((index: number) => {
    setContent((c) => ({
      ...c,
      exercices: c.exercices.length === 1
        ? [{ ...emptyExercise }]
        : c.exercices.filter((_, i) => i !== index),
    }));
  }, []);

  function buildPayload(status: "pending" | "draft") {
    const cleanContent: SessionContent = {
      ...content,
      exercices: content.exercices.filter(
        (ex) => ex.titre.trim() || ex.consignes.trim()
      ),
    };
    const description = summarizeSession(cleanContent);
    const payload: {
      instructor_shooter_id: string;
      type: AssignmentType;
      title: string;
      description: string;
      deadline: string | null;
      status: "pending" | "draft";
      content: SessionContent;
      module_kind?: ModuleKind;
    } = {
      instructor_shooter_id: shooterId!,
      type,
      title: title.trim(),
      description,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      status,
      content: cleanContent,
    };
    if (type === "module") payload.module_kind = moduleKind;
    return payload;
  }

  function validate(requireDeadline = true): string | null {
    if (!shooterId) return "ID de tireur manquant";
    if (!title.trim()) return "Le titre est requis";
    if (requireDeadline && !deadline) return "La deadline est requise";
    return null;
  }

  async function onSave(status: "pending" | "draft") {
    const v = validate(status === "pending");
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: insErr } = await getSupabase()
        .from("instructor_assignments")
        .insert(buildPayload(status));
      if (insErr) throw insErr;
      router.push(`/dashboard/shooter/?id=${shooterId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
      setSubmitting(false);
    }
  }

  function onExportPdf() {
    const v = validate(false);
    if (v) {
      setError(v);
      return;
    }
    const cleanContent: SessionContent = {
      ...content,
      exercices: content.exercices.filter(
        (ex) => ex.titre.trim() || ex.consignes.trim()
      ),
    };
    downloadSessionPdf({
      title: title.trim(),
      type,
      module_kind: type === "module" ? moduleKind : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      shooter_name: shooter?.name ?? "",
      instructor_name: instructorName || "—",
      content: cleanContent,
    });
  }

  if (loading) {
    return (
      <div className="px-6 py-10 font-mono text-xs uppercase tracking-[0.22em] text-[#666]">
        Chargement…
      </div>
    );
  }

  if (!shooterId || !shooter) {
    return (
      <div className="px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#E84040]">
          {error || "Tireur introuvable"}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.22em] text-[#888] hover:text-white"
        >
          ← Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 pb-32 md:px-10 md:py-10">
      <Link
        href={`/dashboard/shooter/?id=${shooterId}`}
        className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#888] transition-colors hover:text-white"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Retour à la fiche
      </Link>

      <div className="mb-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7A0000]">
          Nouvelle séance
        </p>
        <h1 className="mt-2 font-mono text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          Pour {shooter.name}
        </h1>
      </div>

      {error && (
        <div className="mb-6 border border-[#E84040]/50 bg-[#E84040]/[0.08] px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-[#E84040]">
          {error}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <Section label="01" title="Infos générales">
          <Field label="Titre de la séance *">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className={inputCls}
              placeholder="Ex. Séance précision 25m"
            />
          </Field>

          <Field label="Type">
            <ChipGroup
              value={type}
              onChange={(v) => setType(v as AssignmentType)}
              options={[
                { v: "module", l: "Module" },
                { v: "carnet", l: "Carnet" },
                { v: "free", l: "Libre" },
              ]}
            />
          </Field>

          {type === "module" && (
            <Field label="Module">
              <ChipGroup
                value={moduleKind}
                onChange={(v) => setModuleKind(v as ModuleKind)}
                options={[
                  { v: "basique", l: "Basique" },
                  { v: "dry_fire", l: "Dry Fire" },
                  { v: "speciales", l: "Spéciales" },
                  { v: "vector", l: "Vector" },
                ]}
              />
            </Field>
          )}

          <Field label="Deadline *">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Durée estimée">
            <input
              type="text"
              value={content.duree_estimee}
              onChange={(e) => setContent((c) => ({ ...c, duree_estimee: e.target.value }))}
              maxLength={40}
              className={inputCls}
              placeholder="Ex. 45 min"
            />
          </Field>
        </Section>

        <Section label="02" title="Cadrage">
          <Field label="Objectifs">
            <textarea
              value={content.objectifs}
              onChange={(e) => setContent((c) => ({ ...c, objectifs: e.target.value }))}
              rows={5}
              className={textareaCls}
              placeholder="Ce que le tireur doit travailler ou démontrer pendant la séance."
            />
          </Field>

          <Field label="Consignes générales">
            <textarea
              value={content.consignes_generales}
              onChange={(e) =>
                setContent((c) => ({ ...c, consignes_generales: e.target.value }))
              }
              rows={4}
              className={textareaCls}
              placeholder="EPI, sécurité, déroulé, contraintes générales."
            />
          </Field>

          <Field label="Matériel requis">
            <textarea
              value={content.materiel}
              onChange={(e) => setContent((c) => ({ ...c, materiel: e.target.value }))}
              rows={3}
              className={textareaCls}
              placeholder="Arme, chargeurs, munitions, accessoires…"
            />
          </Field>
        </Section>
      </div>

      <div className="mt-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7A0000]">
              03
            </p>
            <h2 className="mt-2 font-mono text-xl font-bold uppercase tracking-tight text-white md:text-2xl">
              Exercices
            </h2>
          </div>
          <button
            type="button"
            onClick={addExercise}
            className="border border-[#1A1A1A] bg-transparent px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#aaa] transition-colors hover:border-[#333] hover:text-white"
          >
            + Ajouter un exercice
          </button>
        </div>

        <div className="space-y-4">
          {content.exercices.map((ex, i) => (
            <div key={i} className="border border-[#1A1A1A] bg-[#0A0A0A] p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7A0000]">
                  Exercice {String(i + 1).padStart(2, "0")}
                </p>
                <button
                  type="button"
                  onClick={() => removeExercise(i)}
                  className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#666] transition-colors hover:text-[#E84040]"
                  aria-label="Supprimer l'exercice"
                >
                  Supprimer
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Titre">
                  <input
                    type="text"
                    value={ex.titre}
                    onChange={(e) => updateExercise(i, { titre: e.target.value })}
                    maxLength={80}
                    className={inputCls}
                    placeholder="Ex. Doublettes 15m"
                  />
                </Field>

                <Field label="Répétitions">
                  <input
                    type="number"
                    min={0}
                    value={ex.repetitions ?? ""}
                    onChange={(e) =>
                      updateExercise(i, {
                        repetitions: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className={inputCls}
                    placeholder="Ex. 5"
                  />
                </Field>

                <Field label="Distance">
                  <input
                    type="text"
                    value={ex.distance}
                    onChange={(e) => updateExercise(i, { distance: e.target.value })}
                    maxLength={30}
                    className={inputCls}
                    placeholder="Ex. 15m"
                  />
                </Field>

                <Field label="Cible">
                  <select
                    value={ex.cible}
                    onChange={(e) => updateExercise(i, { cible: e.target.value as TargetKind | "" })}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {TARGETS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Consignes">
                  <textarea
                    value={ex.consignes}
                    onChange={(e) => updateExercise(i, { consignes: e.target.value })}
                    rows={3}
                    className={textareaCls}
                    placeholder="Détail de l'exécution, contraintes, scoring."
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <Section label="04" title="Notes instructeur (privées)">
          <Field label="Notes — non visibles par le tireur">
            <textarea
              value={content.notes_instructeur}
              onChange={(e) =>
                setContent((c) => ({ ...c, notes_instructeur: e.target.value }))
              }
              rows={4}
              className={textareaCls}
              placeholder="Observations, points à corriger, axe pédagogique."
            />
          </Field>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#1A1A1A] bg-black/95 backdrop-blur md:left-56">
        <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 md:px-10">
          <button
            type="button"
            onClick={() => onSave("draft")}
            disabled={submitting}
            className="border border-[#1A1A1A] bg-transparent px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#aaa] transition-colors hover:border-[#333] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Brouillon
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={submitting}
            className="border border-[#1A1A1A] bg-transparent px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-[#7A0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Exporter PDF
          </button>
          <button
            type="button"
            onClick={() => onSave("pending")}
            disabled={submitting}
            className="border border-[#7A0000] bg-[#7A0000] px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#9A0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sauvegarde…" : "Sauvegarder et assigner"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-[#1A1A1A] bg-black px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors focus:border-[#7A0000]";

const textareaCls = `${inputCls} resize-y`;

function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7A0000]">
        {label}
      </p>
      <h2 className="mt-2 mb-5 font-mono text-xl font-bold uppercase tracking-tight text-white md:text-2xl">
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
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

function ChipGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
            value === o.v
              ? "border-[#7A0000] bg-[#7A0000] text-white"
              : "border-[#1A1A1A] text-[#888] hover:border-[#333] hover:text-white"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
