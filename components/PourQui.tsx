"use client";

import { motion } from "framer-motion";
import { Reveal } from "./motion/Reveal";
import { CardStack, CardItem } from "./motion/CardStack";
import { HoverLift, iconHoverVariants } from "./motion/HoverLift";
import { SectionTag } from "./Problem";
import { ShooterImage } from "./ShooterImage";

const segments = [
  {
    title: "Compétiteurs",
    desc: "Tireurs IPSC, USPSA, dynamiques. Hit Factor, splits, transitions, classifiers — tout est mesuré, tout est exploitable.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  {
    title: "Instructeurs",
    desc: "Outil pédagogique pour structurer tes séances de coaching. Suivi par élève, partage de protocoles, restitution objective et chiffrée.",
    icon: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
  },
  {
    title: "Institutionnels",
    desc: "Forces de l'ordre, militaires, sécurité privée. Standardisation des protocoles, traçabilité, audit qualité de l'entraînement.",
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </>
    ),
  },
];

export function PourQui() {
  return (
    <section className="relative isolate flex w-full items-center overflow-hidden bg-gradient-to-b from-black via-[#0a0000] to-black">
      <ShooterImage
        src="/images/features-shooter.jpg"
        alt=""
        label="Photo tireur — Pour qui"
        className="absolute inset-0 -z-20"
        imgClassName="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/80" />

      <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10">
        <Reveal className="mb-10 max-w-2xl md:mb-14">
          <SectionTag>Pour qui</SectionTag>
          <h2 className="mt-6 font-display text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
            Pensé pour
            <br />
            <span className="text-white">tous les profils exigeants</span>
          </h2>
        </Reveal>

        <CardStack className="grid gap-6 sm:grid-cols-3 md:gap-8">
          {segments.map((s) => (
            <CardItem key={s.title}>
              <HoverLift className="group relative h-full border border-l-4 border-accent bg-bg-1 p-6 md:p-8">
                <motion.svg
                  variants={iconHoverVariants}
                  className="h-12 w-12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  {s.icon}
                </motion.svg>
                <div className="mt-6 font-display text-xl font-bold uppercase tracking-tight md:text-2xl">
                  {s.title}
                </div>
                <p className="mt-4 text-[14px] font-light leading-relaxed text-text-muted md:text-[15px]">
                  {s.desc}
                </p>
              </HoverLift>
            </CardItem>
          ))}
        </CardStack>
      </div>
    </section>
  );
}
