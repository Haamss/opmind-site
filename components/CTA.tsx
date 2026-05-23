"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Reveal } from "./motion/Reveal";
import { ShimmerButton } from "./motion/ShimmerButton";
import { ShooterImage } from "./ShooterImage";

const WAITLIST_URL =
  "https://iqhbxzhpndaeivrzdzyy.supabase.co/functions/v1/waitlist-signup";

export function CTA() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    setErrMsg("");
    try {
      const res = await fetch(WAITLIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("ok");
    } catch {
      setErrMsg("Erreur — réessaie ou écris à contact@opmind.fr");
      setState("err");
    }
  }

  return (
    <section
      id="waitlist"
      className="relative isolate overflow-hidden border-t border-accent/40 py-40 md:py-48"
    >
      {/* Shooter photo as section background */}
      <ShooterImage
        src="/images/cta-shooter.jpg"
        alt=""
        label="Photo tireur — CTA"
        className="absolute inset-0 -z-20"
        imgClassName="h-full w-full object-cover"
      />
      {/* Dark overlay 75% */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/75" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-tactical-grid"
        animate={{ opacity: [0.4, 0.85, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 bg-accent/30 blur-[160px]"
        animate={{ opacity: [0.55, 1, 0.55], scale: [0.95, 1.06, 0.95] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="mx-auto max-w-3xl px-6 text-center md:px-10">
        <Reveal>
          <div className="inline-flex items-center gap-2 border border-accent/60 bg-accent/15 px-4 py-2">
            <motion.span
              className="block h-1.5 w-1.5 bg-accent-bright"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
              Accès anticipé
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="mt-10 font-display text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl">
            Tu veux progresser
            <br />
            ou continuer à{" "}
            <span className="text-white">tirer au hasard</span> ?
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-10 max-w-xl text-base font-light leading-relaxed text-text-muted">
            Rejoins la waitlist et sois parmi les premiers à utiliser OpMind.
            Accès bêta, tarif fondateur.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          {state === "ok" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="mx-auto mt-14 max-w-md border border-accent bg-accent/15 px-6 py-5 font-mono text-sm font-semibold uppercase tracking-[0.12em] text-white"
            >
              Inscription confirmée — on te contacte en priorité.
            </motion.div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="mx-auto mt-14 flex max-w-lg flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ton@email.fr"
                className="flex-1 border border-white/15 bg-bg-1 px-5 py-4 font-sans text-base text-white placeholder:text-text-dim transition-colors focus:border-accent focus:outline-none"
              />
              <ShimmerButton type="submit" disabled={state === "loading"}>
                {state === "loading" ? "Envoi..." : "Rejoindre"}
              </ShimmerButton>
            </form>
          )}
          {state === "err" && (
            <p className="mt-3 font-mono text-xs text-red-400">{errMsg}</p>
          )}
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.15em] text-text-dim">
            Aucun spam. Désabonnement en un clic.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
