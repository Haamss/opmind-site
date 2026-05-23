"use client";

import { motion } from "framer-motion";
import { Reveal } from "./motion/Reveal";
import { PhoneFrame } from "./PhoneFrame";

export function Testimonial() {
  return (
    <section className="relative border-t border-accent/40 bg-bg-1 py-40 md:py-48">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid items-center gap-20 lg:grid-cols-[1fr_1.2fr] lg:gap-28">
          <Reveal>
            <div className="relative mx-auto w-full max-w-sm" style={{ perspective: "1200px" }}>
              <motion.div
                initial={{ rotateY: 12, scale: 0.96 }}
                whileInView={{ rotateY: 6, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ rotateY: 0, scale: 1.02 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <PhoneFrame
                  src="/app-home-1.jpg"
                  alt="OpMind — dashboard"
                  glow
                  pulse
                />
              </motion.div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="font-display text-8xl leading-none text-accent/50">
              &ldquo;
            </div>
            <p className="mt-6 font-display text-3xl font-bold uppercase leading-[1.15] tracking-tight md:text-5xl">
              OpMind m'a permis de structurer mes entraînements et de voir des
              progrès que je ne voyais pas avant.
              <br />
              <span className="text-white">
                Les données sont là, objectives, impossibles à nier.
              </span>
            </p>
            <div className="mt-12 flex items-center gap-5 border-t border-accent/40 pt-10">
              <div className="flex h-14 w-14 items-center justify-center bg-accent-deep font-display text-base font-bold tracking-tight text-white">
                JD
              </div>
              <div>
                <div className="font-display text-xl font-bold uppercase tracking-tight">
                  Julien D.
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
                  Tireur sportif IPSC — Classe B
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
