"use client";

import { motion } from "framer-motion";
import { Reveal } from "./motion/Reveal";
import { CardStack, CardItem } from "./motion/CardStack";
import { HoverLift, iconHoverVariants } from "./motion/HoverLift";
import { ParallaxTitle } from "./motion/ParallaxTitle";
import { PhoneFrame } from "./PhoneFrame";
import { SectionTag } from "./Problem";

const cards = [
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

export function Solution() {
  return (
    <section
      id="solution"
      className="relative border-t border-accent/40 bg-bg-1 py-40 md:py-48"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <ParallaxTitle amount={50} className="mb-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <div className="flex justify-center">
              <SectionTag>OpMind, la solution</SectionTag>
            </div>
            <h2 className="mt-8 font-display text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl">
              Un outil. Une méthode.
              <br />
              <span className="text-white">Des résultats.</span>
            </h2>
            <p className="mt-10 text-base font-light leading-relaxed text-text-muted">
              Chaque fonctionnalité d'OpMind est conçue pour transformer ta
              façon de t'entraîner.
            </p>
          </Reveal>
        </ParallaxTitle>

        <CardStack className="grid grid-cols-1 gap-10 md:grid-cols-2">
          {cards.map((c) => (
            <CardItem key={c.title}>
              <HoverLift className="group relative grid h-full grid-cols-[auto_1fr] items-stretch gap-10 border border-l-4 border-accent bg-black p-10">
                <PhoneFrame
                  src={c.image}
                  alt={c.title}
                  label={c.title}
                  className="w-44"
                />
                <div className="flex flex-col justify-center">
                  <motion.div
                    variants={iconHoverVariants}
                    className="inline-flex h-12 w-12 items-center justify-center border border-accent/60 bg-accent/15"
                  >
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
                  </motion.div>
                  <div className="mt-8 font-display text-2xl font-bold uppercase leading-tight tracking-tight">
                    {c.title}
                  </div>
                  <p className="mt-5 text-[15px] font-light leading-relaxed text-text-muted">
                    {c.desc}
                  </p>
                </div>
              </HoverLift>
            </CardItem>
          ))}
        </CardStack>
      </div>
    </section>
  );
}
