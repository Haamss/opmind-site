"use client";

import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "framer-motion";

export function Nav() {
  const { scrollY } = useScroll();
  const blur = useTransform(scrollY, [0, 200], [0, 18]);
  const backdrop = useMotionTemplate`blur(${blur}px) saturate(140%)`;
  const bgColor = useTransform(
    scrollY,
    [0, 200],
    ["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]
  );
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 1]);
  const navY = useTransform(scrollY, [0, 100], [-4, 0]);

  return (
    <motion.nav
      style={{
        backgroundColor: bgColor,
        backdropFilter: backdrop,
        WebkitBackdropFilter: backdrop,
        y: navY,
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <motion.div
        style={{ opacity: borderOpacity }}
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-bright/65 to-transparent"
      />
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6 md:px-10">
        <a
          href="#accueil"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="group block cursor-pointer"
          aria-label="Retour en haut de page"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="OpMind"
            className="h-20 w-auto transition-all duration-300 ease-out group-hover:scale-[1.08] group-hover:drop-shadow-[0_0_20px_rgba(122,0,0,0.75)]"
            width={325}
            height={80}
          />
        </a>
        <ul className="hidden items-center gap-10 md:flex">
          {[
            { href: "#fonctionnalites", label: "Fonctionnalités" },
            { href: "#solution", label: "À propos" },
            { href: "#faq", label: "FAQ" },
          ].map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="group relative font-mono text-xs font-semibold uppercase tracking-[0.15em] text-text-muted transition hover:text-white"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent-bright transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
          <li>
            <Link
              href="/instructors"
              className="group relative font-mono text-xs font-semibold uppercase tracking-[0.15em] text-text-muted transition hover:text-white"
            >
              Pour les instructeurs
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent-bright transition-all duration-300 group-hover:w-full" />
            </Link>
          </li>
          <li>
            <Link
              href="/login"
              className="border-none bg-transparent font-mono text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:text-[#7A0000]"
            >
              Se connecter
            </Link>
          </li>
          <li>
            <Link
              href="/register"
              className="border-none bg-[#7A0000] px-5 py-2 font-mono text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#5A0000]"
            >
              S'inscrire
            </Link>
          </li>
          <li>
            <a
              href="#waitlist"
              className="border border-white bg-transparent px-5 py-2 font-mono text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
            >
              Rejoindre la waitlist
            </a>
          </li>
        </ul>
      </div>
    </motion.nav>
  );
}
