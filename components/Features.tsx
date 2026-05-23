"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "./motion/Reveal";
import { PhoneFrame } from "./PhoneFrame";
import { SectionTag } from "./Problem";

type Feature = {
  num: string;
  title: string;
  desc: string;
  tag?: string;
  image?: string;
};

const features: Feature[] = [
  {
    num: "01",
    title: "Module Basique — 15 séances progressives",
    desc: "Chaque séance est structurée en 3 blocs (échauffement, tir principal, restitution) avec objectifs, consignes, chronométrage, et saisie de zones d'impact. Compatible dry fire et live fire.",
    tag: "Programme complet",
    image: "/app-home-2.jpg",
  },
  {
    num: "02",
    title: "Standards IPSC",
    desc: "21 standards de référence (Bill Drill, Double Tap, FAST, Mozambique...) avec suivi de ton meilleur temps et progression mesurable.",
    tag: "Références IPSC",
    image: "/app-home-1.jpg",
  },
  {
    num: "03",
    title: "Module Vector — Stages 3D",
    desc: "Constructeur de stages IPSC en 3D avec positions, cibles A/C/D, séquences de tir et calcul automatique du Hit Factor. Préparation classifier complète.",
    tag: "Préparation IPSC",
    image: "/app-vector.jpg",
  },
  {
    num: "04",
    title: "Hit Factor & Score IPSC",
    desc: "Calcul automatique du Hit Factor à partir de tes zones d'impact. Zones A/C/D, Miss, No-Go. Scoring Major / Minor.",
    image: "/app-home-2.jpg",
  },
  {
    num: "05",
    title: "Module Performance — Analyse avancée",
    desc: "Corrélation entre tes données subjectives (sommeil, stress, fatigue, motivation) et tes résultats objectifs. Courbes de progression, score de tendance, analyse de fatigue intra-séance par bloc.",
    tag: "Analytics",
    image: "/app-home-1.jpg",
  },
  {
    num: "06",
    title: "BLE SG Timer 2",
    desc: "Connexion directe avec le SG Timer 2 via Bluetooth. Démarrage depuis l'app, splits en temps réel, archivage automatique.",
    tag: "Compatible SG Timer",
    image: "/app-home-2.jpg",
  },
  {
    num: "07",
    title: "Carnet de Tir personnalisé",
    desc: "Crée tes séances personnalisées, importe et exporte en JSON. Ton historique, tes règles, tes formats.",
    image: "/app-home-1.jpg",
  },
  {
    num: "08",
    title: "Sync Supabase — Cloud EU",
    desc: "Toutes tes données synchronisées sur le cloud EU. Change de téléphone sans perdre ton historique. Hébergement français, RGPD-compliant.",
    tag: "Cloud EU",
    image: "/app-home-2.jpg",
  },
];

const textVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

export function Features() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const total = features.length;
  const f = features[idx];

  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    setDir(-1);
    setIdx((i) => (i - 1 + total) % total);
  }
  function next(e: React.MouseEvent) {
    e.stopPropagation();
    setDir(1);
    setIdx((i) => (i + 1) % total);
  }

  return (
    <section
      id="fonctionnalites"
      className="relative flex w-full items-center bg-gradient-to-b from-[#0a0000] to-black"
    >
      <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10">
        <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
          <Reveal className="max-w-xl">
            <SectionTag>Fonctionnalités</SectionTag>
            <h2 className="mt-6 font-display text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-6xl">
              Conçu pour
              <br />
              <span className="text-white">les exigeants</span>
            </h2>
          </Reveal>

          <div className="hidden font-mono text-xs uppercase tracking-[0.22em] text-text-muted md:block">
            {String(idx + 1).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </div>
        </div>

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="relative min-h-[300px]">
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div
                key={"text-" + idx}
                custom={dir}
                variants={textVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="font-display text-6xl font-black tabular-nums leading-none text-accent md:text-7xl">
                  {f.num}
                </span>
                <h3 className="mt-4 font-display text-2xl font-bold uppercase leading-[1.05] tracking-tight md:text-4xl">
                  {f.title}
                </h3>
                {f.tag && (
                  <div className="mt-5 inline-flex items-center gap-2.5 bg-accent-deep px-4 py-2.5">
                    <motion.span
                      className="block h-1.5 w-1.5 bg-white"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
                      {f.tag}
                    </span>
                  </div>
                )}
                <p className="mt-6 max-w-lg text-[15px] font-light leading-relaxed text-text-muted md:text-base">
                  {f.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            className="relative mx-auto w-full max-w-[180px] sm:max-w-[210px] lg:max-w-[260px]"
            style={{ perspective: "1200px" }}
          >
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div
                key={"img-" + idx}
                initial={{ opacity: 0, scale: 0.94, rotateY: dir > 0 ? -10 : 10 }}
                animate={{ opacity: 1, scale: 1, rotateY: -4 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <PhoneFrame
                  src={f.image}
                  alt={f.title}
                  label={f.title}
                  glow
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4 md:mt-12 md:gap-6">
          <button
            data-no-zoom
            onClick={prev}
            className="flex h-11 w-11 items-center justify-center border border-accent/60 text-white transition-colors hover:bg-accent-deep md:h-12 md:w-12"
            aria-label="Fonctionnalité précédente"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex gap-1.5">
            {features.map((_, i) => (
              <motion.span
                key={i}
                className="block h-1 w-6"
                animate={{
                  backgroundColor:
                    i === idx ? "#7A0000" : "rgba(255,255,255,0.18)",
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          <button
            data-no-zoom
            onClick={next}
            className="flex h-11 w-11 items-center justify-center border border-accent/60 text-white transition-colors hover:bg-accent-deep md:h-12 md:w-12"
            aria-label="Fonctionnalité suivante"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
