"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "./motion/Reveal";
import { ParallaxTitle } from "./motion/ParallaxTitle";
import { PhoneFrame } from "./PhoneFrame";
import { SectionTag } from "./Problem";

type Card = {
  title: string;
  desc: string;
  image: string;
  icon: React.ReactNode;
};

const cards: Card[] = [
  {
    title: "Séances structurées",
    desc: "Échauffement, tir, restitution. Une méthode claire et progressive sur 15 séances Basique avec saisie de zones d'impact et chronométrage.",
    image: "/app-home-2.jpg",
    icon: (
      <>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </>
    ),
  },
  {
    title: "Stages IPSC réalistes",
    desc: "Constructeur 3D de stages avec cibles A/C/D, positions, séquences de tir et calcul automatique du Hit Factor.",
    image: "/app-vector.jpg",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
  {
    title: "Analyse intelligente",
    desc: "Hit Factor, accuracy, courbes de progression. Visualise tes performances et identifie tes axes d'amélioration objectivement.",
    image: "/app-home-1.jpg",
    icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  },
  {
    title: "Historique complet",
    desc: "Chaque séance archivée avec photos, splits, scores de zone et feedback contextuel. Accès instantané à toutes tes données.",
    image: "/app-home-2.jpg",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
  },
];

const textVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

export function Solution() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const total = cards.length;
  const c = cards[idx];

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
      id="solution"
      className="relative flex min-h-screen w-full flex-col justify-center border-t border-accent/40 bg-bg-1 py-12 md:py-16"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col px-6 md:px-10">
        <ParallaxTitle amount={50} className="mb-8 md:mb-12">
          <Reveal className="mx-auto max-w-3xl text-center">
            <div className="flex justify-center">
              <SectionTag>OpMind, la solution</SectionTag>
            </div>
            <h2 className="mt-6 font-display text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-6xl">
              Un outil. Une méthode.
              <br />
              <span className="text-white">Des résultats.</span>
            </h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-text-muted md:text-base">
              Chaque fonctionnalité d'OpMind est conçue pour transformer ta
              façon de t'entraîner.
            </p>
          </Reveal>
        </ParallaxTitle>

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="relative min-h-[260px] md:min-h-[300px]">
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
                <div className="inline-flex h-12 w-12 items-center justify-center border border-accent/60 bg-accent/15 text-accent">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    {c.icon}
                  </svg>
                </div>
                <h3 className="mt-6 font-display text-3xl font-bold uppercase leading-[1.05] tracking-tight md:text-5xl">
                  {c.title}
                </h3>
                <p className="mt-6 max-w-lg text-[15px] font-light leading-relaxed text-text-muted md:text-base">
                  {c.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            className="relative mx-auto w-48 md:w-56"
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
                  src={c.image}
                  alt={c.title}
                  label={c.title}
                  glow
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-5 md:mt-12 md:gap-6">
          <button
            data-no-zoom
            onClick={prev}
            className="flex h-11 w-11 items-center justify-center border border-accent/60 text-white transition-colors hover:bg-accent-deep md:h-12 md:w-12"
            aria-label="Précédent"
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

          <div className="font-mono text-sm uppercase tracking-[0.22em] text-text-muted tabular-nums">
            {String(idx + 1).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </div>

          <button
            data-no-zoom
            onClick={next}
            className="flex h-11 w-11 items-center justify-center border border-accent/60 text-white transition-colors hover:bg-accent-deep md:h-12 md:w-12"
            aria-label="Suivant"
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
