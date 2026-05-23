import Link from "next/link";

export function Footer() {
  const links: { href: string; label: string }[] = [
    { href: "#fonctionnalites", label: "Fonctionnalités" },
    { href: "#waitlist", label: "Waitlist" },
    { href: "#faq", label: "FAQ" },
    { href: "mailto:contact@opmind.fr", label: "Contact" },
    { href: "/mentions-legales", label: "Mentions légales" },
    { href: "/confidentialite", label: "Confidentialité" },
    { href: "/cgu", label: "CGU" },
  ];
  return (
    <footer className="border-t border-accent/40 bg-bg-1 py-20">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="flex flex-col items-start justify-between gap-12 md:flex-row md:items-center">
          <a href="#accueil" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="OpMind"
              className="h-12 w-auto"
              width={195}
              height={48}
            />
            <span className="font-mono text-xl font-bold uppercase tracking-tight text-white">
              OpMind
            </span>
          </a>

          <ul className="flex flex-wrap gap-x-10 gap-y-3">
            {links.map((l) => {
              const className =
                "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted transition hover:text-accent-bright";
              const isInternalRoute = l.href.startsWith("/");
              return (
                <li key={l.href}>
                  {isInternalRoute ? (
                    <Link href={l.href} className={className}>
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className={className}>
                      {l.label}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-white/8 pt-10 md:flex-row md:items-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
            © {new Date().getFullYear()} OpMind — Tous droits réservés
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
            Made in France · Hébergé EU
          </p>
        </div>
      </div>
    </footer>
  );
}
