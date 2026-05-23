"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "./motion/Reveal";
import { ParallaxTitle } from "./motion/ParallaxTitle";
import { PhoneFrame } from "./PhoneFrame";
import { SectionTag } from "./Problem";

const faqs = [
  {
    q: "OpMind fonctionne-t-il sans connexion internet ?",
    a: "Oui. Toutes les fonctionnalités d'entraînement (séances, shot timer, dry fire, carnet) marchent 100% offline. La sync Supabase se fait dès que tu retrouves le réseau — idéal pour le terrain.",
  },
  {
    q: "Faut-il un shot timer matériel pour utiliser l'app ?",
    a: "Non. OpMind embarque un shot timer micro précis qui détecte tes coups directement avec le micro du téléphone. Si tu as un SG Timer 2, tu peux le connecter en BLE pour une précision matérielle.",
  },
  {
    q: "Quelles disciplines sont prises en charge ?",
    a: "OpMind est calibré IPSC (zones A/C/D, Hit Factor, scoring Major/Minor), mais les modules Carnet de Tir et Standards conviennent à toute discipline de tir dynamique ou statique.",
  },
  {
    q: "Mes données sont-elles privées ?",
    a: "Oui. Hébergement Supabase EU, chiffrement TLS, RLS strict (tu ne vois que tes propres données). Aucune revente, aucun tracking publicitaire. Désabonnement et suppression du compte en un clic.",
  },
  {
    q: "Quand sort la version stable ?",
    a: "Bêta privée en cours, version 1.0 prévue pour 2026. Inscris-toi sur la waitlist pour un accès anticipé et le tarif fondateur.",
  },
  {
    q: "Sur quelles plateformes l'application est-elle disponible ?",
    a: "Android (APK direct + Play Store en cours), iOS prévu après la V1. L'app est développée en React Native / Expo.",
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      className="relative isolate overflow-hidden bg-gradient-to-b from-[#0a0000] to-black py-40 md:py-48"
    >
      {/* Decorative floating phone on the right */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 hidden w-[380px] -translate-y-1/2 translate-x-1/4 opacity-15 lg:block"
        style={{ perspective: "1200px" }}
      >
        <motion.div
          initial={{ rotate: 6, y: 20 }}
          animate={{ rotate: [6, 9, 6], y: [20, 0, 20] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <PhoneFrame src="/app-home-1.jpg" alt="" />
        </motion.div>
      </div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/3 -z-10 h-[500px] w-[500px] bg-accent/15 blur-[120px]"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-4xl px-6 md:px-10">
        <ParallaxTitle amount={40} className="mb-20">
          <Reveal className="text-center">
            <div className="flex justify-center">
              <SectionTag>Questions fréquentes</SectionTag>
            </div>
            <h2 className="mt-8 font-display text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl">
              Tout ce que tu dois
              <br />
              <span className="text-white">savoir</span>
            </h2>
          </Reveal>
        </ParallaxTitle>

        <div className="border border-l-4 border-accent divide-y divide-white/8 bg-bg-1">
          {faqs.map((f, i) => (
            <FAQItem key={f.q} q={f.q} a={f.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

const itemReveal = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      delay: i * 0.06,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      custom={index}
      variants={itemReveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center justify-between gap-10 px-10 py-8 text-left transition hover:bg-bg-2"
        aria-expanded={open}
      >
        <span
          className={
            "font-display text-lg font-bold uppercase tracking-tight transition md:text-xl " +
            (open ? "text-white" : "")
          }
        >
          {q}
        </span>
        <motion.span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center border"
          animate={{
            rotate: open ? 135 : 0,
            backgroundColor: open ? "#7a0000" : "rgba(0,0,0,0)",
            borderColor: open ? "#7a0000" : "rgba(122,0,0,0.6)",
            color: "#ffffff",
          }}
          transition={{ type: "spring", stiffness: 280, damping: 16 }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 24,
              opacity: { duration: 0.25 },
            }}
            className="overflow-hidden"
          >
            <div className="px-10 pb-9 text-[15px] font-light leading-relaxed text-text-muted">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
