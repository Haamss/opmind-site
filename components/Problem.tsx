"use client";

import { motion } from "framer-motion";
import { Reveal } from "./motion/Reveal";
import { CardStack, CardItem } from "./motion/CardStack";
import { HoverLift, iconHoverVariants } from "./motion/HoverLift";
import { ShooterImage } from "./ShooterImage";

const cards = [
  {
    title: "Pas de structure",
    desc: "Des séances désorganisées ne mènent à aucune progression mesurable. Sans plan, tu travailles dur sans avancer.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
  },
  {
    title: "Pas d'analyse",
    desc: "Sans données fiables, impossible de savoir ce qui doit être amélioré. L'intuition ne suffit pas.",
    icon: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
  },
  {
    title: "Pas de retour objectif",
    desc: "Sans feedback précis, tu répètes les mêmes erreurs. Les corrections restent superficielles et temporaires.",
    icon: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
];

export function Problem() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#0a0000] to-black py-40 md:py-48">
      {/* Shooter photo as section background */}
      <ShooterImage
        src="/images/problem-shooter.jpg"
        alt=""
        label="Photo tireur — Problem"
        className="absolute inset-0 -z-20"
        imgClassName="h-full w-full object-cover"
      />
      {/* Dark overlay 80% */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/80" />
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <Reveal className="mb-20 max-w-2xl">
          <SectionTag>Le problème</SectionTag>
          <h2 className="mt-8 font-display text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl">
            Sans méthode,
            <br />
            <span className="text-white">pas de progression</span>
          </h2>
        </Reveal>

        <CardStack className="grid gap-10 sm:grid-cols-3">
          {cards.map((c) => (
            <CardItem key={c.title}>
              <HoverLift className="group relative h-full border border-l-4 border-accent bg-bg-1 p-10">
                <motion.svg
                  variants={iconHoverVariants}
                  className="h-14 w-14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  {c.icon}
                </motion.svg>
                <div className="mt-10 font-display text-2xl font-bold uppercase tracking-tight">
                  {c.title}
                </div>
                <p className="mt-5 text-[15px] font-light leading-relaxed text-text-muted">
                  {c.desc}
                </p>
              </HoverLift>
            </CardItem>
          ))}
        </CardStack>
      </div>
    </section>
  );
}

export function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2.5 bg-accent-deep px-4 py-2.5">
      <motion.span
        className="block h-1.5 w-1.5 bg-white"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
        {children}
      </span>
    </div>
  );
}
