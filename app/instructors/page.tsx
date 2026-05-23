"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.1, staggerChildren: 0.15 } },
};

const lineX: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.8, ease } },
};

const pains = [
  {
    title: "Le carnet papier ne mesure rien",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
  },
  {
    title: "Aucune vue consolidée de l'effectif",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    title: "Aucune traçabilité pour les budgets",
    icon: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
  },
];

const features = [
  {
    num: "01",
    title: "Suivi individuel",
    line: "Une fiche par tireur, une courbe par progression.",
  },
  {
    num: "02",
    title: "Assignation de séances",
    line: "Envoyez un drill, suivez la complétion en temps réel.",
  },
  {
    num: "03",
    title: "Code QR de liaison",
    line: "Déploiement en 30 secondes, sans infrastructure IT.",
  },
  {
    num: "04",
    title: "Données exportables",
    line: "CSV, JSON, bilans annuels prêts à présenter.",
  },
];

const profiles = [
  {
    title: "Forces de l'ordre",
    line: "Qualifications annuelles, niveaux par agent.",
  },
  {
    title: "Militaires",
    line: "Préparation aux évaluations opérationnelles.",
  },
  {
    title: "Instructeurs civils",
    line: "Clubs, compétiteurs, écoles de tir.",
  },
];

export default function InstructorsPage() {
  return (
    <>
      <Nav />

      <main className="bg-black text-white">
        {/* HERO — title, line, sentence, button. Nothing else. */}
        <section className="flex min-h-screen items-center bg-black px-6 pt-32 pb-24 md:px-10">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="mx-auto w-full max-w-6xl px-8"
          >
            <motion.h1
              variants={fadeUp}
              className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-7xl"
            >
              Gérez la progression
              <br />
              de votre effectif.
            </motion.h1>
            <motion.div
              variants={lineX}
              style={{ transformOrigin: "left" }}
              className="mt-12 h-px w-32 bg-accent"
            />
            <motion.p
              variants={fadeUp}
              className="mt-12 max-w-xl text-lg font-light leading-relaxed text-text-muted"
            >
              Un outil unique pour suivre chaque tireur de votre effectif, sans
              infrastructure IT.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-14">
              <Link
                href="/register"
                className="inline-flex items-center gap-3 bg-accent px-8 py-4 font-mono text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-deep"
              >
                Demander un accès
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
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* PROBLEM — 2 columns, big 3 left, stagger list right. */}
        <section className="bg-black px-6 py-32 md:px-10 md:py-40">
          <div className="mx-auto grid max-w-6xl gap-16 px-8 md:grid-cols-[auto_1fr] md:gap-24">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              <motion.p
                variants={fadeUp}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-accent-bright"
              >
                Le constat
              </motion.p>
              <motion.span
                variants={fadeUp}
                className="mt-6 block font-display text-[120px] font-black tabular-nums leading-none text-accent md:text-[180px]"
              >
                3
              </motion.span>
              <motion.div
                variants={lineX}
                style={{ transformOrigin: "left" }}
                className="mt-6 h-px w-24 bg-accent"
              />
              <motion.p
                variants={fadeUp}
                className="mt-6 font-mono text-xs uppercase tracking-[0.22em] text-text-muted"
              >
                Frictions terrain
              </motion.p>
            </motion.div>

            <motion.ul
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="flex flex-col"
            >
              {pains.map((p) => (
                <motion.li
                  key={p.title}
                  variants={fadeUp}
                  className="flex items-start gap-6 border-b border-white/10 py-8 first:pt-0 last:border-0"
                >
                  <svg
                    className="mt-1 h-6 w-6 shrink-0 text-accent"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    {p.icon}
                  </svg>
                  <h3 className="font-display text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
                    {p.title}
                  </h3>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </section>

        {/* WHAT OPMIND CHANGES — alternating rows, text + decorative number. */}
        <section className="border-t border-white/5 bg-bg-1 px-6 py-32 md:px-10 md:py-40">
          <div className="mx-auto max-w-6xl px-8">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="mb-24"
            >
              <motion.p
                variants={fadeUp}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-accent-bright"
              >
                Ce qu&apos;OpMind change
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="mt-6 font-display text-3xl font-black uppercase leading-[0.95] tracking-tight md:text-5xl"
              >
                Un outil conçu pour
                <br />
                <span className="text-white">le pas de tir.</span>
              </motion.h2>
              <motion.div
                variants={lineX}
                style={{ transformOrigin: "left" }}
                className="mt-10 h-px w-24 bg-accent"
              />
            </motion.div>

            <div className="space-y-24 md:space-y-32">
              {features.map((f, i) => (
                <FeatureRow key={f.num} feature={f} reverse={i % 2 === 1} />
              ))}
            </div>
          </div>
        </section>

        {/* FOR WHOM — 3 minimal cards with animated bottom border. */}
        <section className="border-t border-white/5 bg-black px-6 py-32 md:px-10 md:py-40">
          <div className="mx-auto max-w-6xl px-8">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="mb-20"
            >
              <motion.p
                variants={fadeUp}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-accent-bright"
              >
                Pour qui
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="mt-6 font-display text-3xl font-black uppercase leading-[0.95] tracking-tight md:text-5xl"
              >
                Les professionnels
                <br />
                <span className="text-white">du tir.</span>
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="grid gap-12 md:grid-cols-3"
            >
              {profiles.map((p) => (
                <motion.div key={p.title} variants={fadeUp}>
                  <h3 className="font-display text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl">
                    {p.title}
                  </h3>
                  <p className="mt-4 text-[15px] font-light leading-relaxed text-text-muted">
                    {p.line}
                  </p>
                  <motion.div
                    variants={lineX}
                    style={{ transformOrigin: "left" }}
                    className="mt-8 h-px w-full bg-accent"
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FINAL CTA — full bordeaux background, centered. */}
        <section className="bg-[#7A0000] px-6 py-32 md:px-10 md:py-40">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="mx-auto max-w-3xl px-8 text-center"
          >
            <motion.h2
              variants={fadeUp}
              className="font-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-white md:text-6xl"
            >
              Prêt à structurer
              <br />
              votre instruction ?
            </motion.h2>
            <motion.div
              variants={fadeUp}
              className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-3 bg-white px-8 py-4 font-mono text-sm font-bold uppercase tracking-[0.18em] text-[#7A0000] transition-colors hover:bg-white/90"
              >
                Créer mon compte
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
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-3 border border-white bg-transparent px-8 py-4 font-mono text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10"
              >
                Voir la démo
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function FeatureRow({
  feature,
  reverse,
}: {
  feature: { num: string; title: string; line: string };
  reverse: boolean;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      className="grid items-center gap-12 md:grid-cols-2 md:gap-16"
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, x: reverse ? 40 : -40 },
          show: { opacity: 1, x: 0, transition: { duration: 0.6, ease } },
        }}
        className={reverse ? "md:order-2" : ""}
      >
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-accent-bright">
          {feature.num}
        </p>
        <h3 className="mt-4 font-display text-3xl font-bold uppercase leading-tight tracking-tight md:text-4xl">
          {feature.title}
        </h3>
        <p className="mt-6 max-w-md text-base font-light leading-relaxed text-text-muted">
          {feature.line}
        </p>
      </motion.div>
      <motion.div
        variants={{
          hidden: { opacity: 0, x: reverse ? -40 : 40 },
          show: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.6, ease, delay: 0.1 },
          },
        }}
        className={`overflow-hidden ${reverse ? "md:order-1" : ""}`}
      >
        <span className="block font-display text-[120px] font-black tabular-nums leading-none text-accent/30 md:text-[200px]">
          {feature.num}
        </span>
      </motion.div>
    </motion.div>
  );
}
