"use client";

import { motion } from "framer-motion";
import { ScrambleText } from "./motion/ScrambleText";
import { Counter } from "./motion/Counter";
import { ShimmerButton } from "./motion/ShimmerButton";
import { PhoneFrame } from "./PhoneFrame";
import { ShooterImage } from "./ShooterImage";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section
      id="accueil"
      className="relative isolate flex min-h-screen items-center overflow-hidden py-40"
    >
      {/* Background layers */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black via-[#0a0000] to-black" />
      {/* Shooter photo behind everything */}
      <ShooterImage
        src="/images/hero-shooter.jpg"
        alt=""
        label="Photo tireur — Hero"
        className="absolute inset-0 -z-10"
        imgClassName="h-full w-full object-cover"
      />
      {/* Black overlay 70% to keep text legible */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/70" />
      <motion.div
        className="absolute inset-0 -z-10 bg-tactical-grid"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Pulsing bordeaux blob */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 -z-10 h-[700px] w-[800px] bg-accent/30 blur-[140px]"
        animate={{ opacity: [0.45, 0.95, 0.45], scale: [0.95, 1.06, 0.95] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 px-6 md:px-10 lg:grid-cols-2 lg:gap-12">
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="mb-10 inline-flex items-center gap-2.5 bg-accent-deep px-4 py-2.5"
          >
            <motion.span
              className="block h-1.5 w-1.5 bg-white"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
              Application de training au tir
            </span>
          </motion.div>

          <h1 className="font-display text-6xl font-black uppercase leading-[0.9] tracking-tight md:text-7xl lg:text-8xl">
            <ScrambleText text="Structure" delay={0.3} duration={0.7} />
            <br />
            <ScrambleText text="ton tir." delay={0.7} duration={0.6} />
            <br />
            <ScrambleText text="Analyse." delay={1.05} duration={0.55} />
            <br />
            <ScrambleText
              text="Progresse."
              delay={1.4}
              duration={0.7}
              className="text-white"
            />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 2.1, ease }}
            className="mt-12 max-w-xl text-lg font-light leading-relaxed text-text-muted"
          >
            OpMind est l'application d'entraînement pensée pour les tireurs
            exigeants. Structure tes séances, analyse chaque performance, passe
            au niveau supérieur.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 2.3, ease }}
            className="mt-14 flex flex-col gap-4 sm:flex-row"
          >
            <ShimmerButton href="#waitlist" variant="primary">
              Rejoindre la waitlist
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </ShimmerButton>
            <ShimmerButton href="#fonctionnalites" variant="ghost">
              Voir les fonctionnalités
            </ShimmerButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 2.5, ease }}
            className="mt-20 grid grid-cols-3 gap-10 border-t border-accent/40 pt-10"
          >
            <Stat to={15} suffix="+" label="Séances Basique" delay={2.7} />
            <Stat to={4} suffix="+" label="Modules actifs" delay={2.85} />
            <Stat to={100} suffix="%" label="Offline capable" delay={3.0} />
          </motion.div>
        </div>

        {/* Phone mockup right-anchored */}
        <div
          className="relative w-full justify-self-end lg:max-w-md"
          style={{ perspective: "1200px" }}
        >
          <motion.div
            initial={{ opacity: 0, x: 240, rotateY: -28, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, rotateY: -8, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.5, ease }}
            whileHover={{ rotateY: 0, scale: 1.04 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <PhoneFrame src="/app-home-1.jpg" alt="OpMind — accueil" pulse glow />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  to,
  suffix,
  label,
  delay,
}: {
  to: number;
  suffix: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease }}
    >
      <div className="font-mono text-5xl font-bold tabular-nums">
        <Counter to={to} delay={delay + 0.05} duration={1.4} suffix={suffix} />
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
        {label}
      </div>
    </motion.div>
  );
}
