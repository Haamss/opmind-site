import Link from "next/link";
import type { ReactNode } from "react";

const legalLinks = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
];

type LayoutProps = {
  tag: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalLayout({ tag, title, updatedAt, children }: LayoutProps) {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-6 md:px-10">
          <Link
            href="/"
            className="block transition hover:opacity-80"
            aria-label="Accueil OpMind"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="OpMind" className="h-12 w-auto" />
          </Link>
          <Link
            href="/"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#888] transition-colors hover:text-white"
          >
            ← Retour
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
        <div className="inline-flex items-center gap-2.5 bg-[#5A0000] px-4 py-2.5">
          <span className="block h-1.5 w-1.5 bg-white" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
            {tag}
          </span>
        </div>

        <h1 className="mt-8 font-mono text-4xl font-bold uppercase tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[#666]">
          Dernière mise à jour — {updatedAt}
        </p>

        <div className="mt-10 h-px w-24 bg-[#7A0000]" />

        <div className="mt-10">{children}</div>
      </article>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-3 px-6 py-10 md:flex-row md:items-center md:px-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#666]">
            © {new Date().getFullYear()} OpMind — Hamid Bride
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#666] transition-colors hover:text-[#7A0000]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="font-mono text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
        {title}
      </h2>
      <div className="legal-prose mt-5 space-y-4 text-[15px] font-light leading-relaxed text-[#aaaaaa]">
        {children}
      </div>
    </section>
  );
}
