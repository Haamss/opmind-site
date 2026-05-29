import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/* ──────────────  Tokens  ────────────── */

const BG = "#0a0a0c";
const ACCENT = "#7A0000";
const INK = "#ebe5d2";
const DIM = "rgba(235,229,210,0.45)";
const DIM_STRONG = "rgba(235,229,210,0.65)";
const LINE = "rgba(235,229,210,0.08)";

const FONT_DISPLAY = "Antonio, 'Barlow Condensed', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Rajdhani', monospace";
const FONT_BODY = "'Barlow', system-ui, sans-serif";

export const metadata: Metadata = {
  title: "Mentions légales — OpMind",
  description:
    "Mentions légales du site OpMind — éditeur, hébergement, propriété intellectuelle.",
};

/* ──────────────  Page  ────────────── */

export default function MentionsLegalesPage() {
  return (
    <main
      style={{
        background: BG,
        color: INK,
        fontFamily: FONT_BODY,
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <TopBar />

      <article
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "120px 32px",
        }}
      >
        <PageTitle>Mentions légales</PageTitle>

        <LegalSection title="Éditeur">
          <p style={paragraphStyle}>
            OpMind — Application d&apos;entraînement au tir sportif.
          </p>
          <p style={paragraphStyle}>
            Éditeur : <strong style={strongStyle}>[Ton nom]</strong>.
          </p>
          <p style={paragraphStyle}>
            Statut : Auto-entrepreneur.
          </p>
          <p style={paragraphStyle}>
            Email :{" "}
            <a href="mailto:opmind.strat@gmail.com" style={linkStyle}>
              opmind.strat@gmail.com
            </a>
          </p>
        </LegalSection>

        <LegalSection title="Hébergement">
          <p style={paragraphStyle}>
            Le site est hébergé par <strong style={strongStyle}>GitHub Pages</strong> —
            GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107,
            USA.
          </p>
        </LegalSection>

        <LegalSection title="Propriété intellectuelle">
          <p style={paragraphStyle}>
            L&apos;ensemble du contenu de ce site (textes, visuels, code,
            marque OpMind) est protégé par le droit d&apos;auteur et le droit
            des marques. Toute reproduction, représentation, modification ou
            adaptation, totale ou partielle, sans autorisation écrite préalable
            est interdite.
          </p>
        </LegalSection>

        <UpdatedAt />
      </article>

      <Footer />
    </main>
  );
}

/* ──────────────  Shared blocks (inline)  ────────────── */

function TopBar() {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        zIndex: 50,
        background: "rgba(10,10,12,0.7)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <Link
        href="/"
        aria-label="Accueil OpMind"
        style={{ display: "inline-block", textDecoration: "none" }}
      >
        <OpMindLogo />
      </Link>
      <Link
        href="/login"
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: DIM_STRONG,
          textDecoration: "none",
        }}
      >
        Se connecter →
      </Link>
    </header>
  );
}

function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: "clamp(40px, 7vw, 64px)",
        fontWeight: 700,
        lineHeight: 0.98,
        letterSpacing: "-0.03em",
        textTransform: "uppercase",
        color: INK,
        margin: 0,
      }}
    >
      {children}
    </h1>
  );
}

function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginTop: 56 }}>
      <h2
        style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: ACCENT,
          margin: 0,
          marginBottom: 20,
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </section>
  );
}

function UpdatedAt() {
  return (
    <p
      style={{
        marginTop: 80,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: DIM,
      }}
    >
      Dernière mise à jour : Mai 2026
    </p>
  );
}

function Footer() {
  return (
    <footer
      style={{
        padding: "32px",
        borderTop: `1px solid ${LINE}`,
        background: BG,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: DIM,
      }}
    >
      <span>© OpMind · 2026</span>
      <div style={{ display: "flex", gap: 20 }}>
        <Link href="/cgu" style={{ color: DIM, textDecoration: "none" }}>
          CGU
        </Link>
        <Link
          href="/confidentialite"
          style={{ color: DIM, textDecoration: "none" }}
        >
          Confidentialité
        </Link>
        <Link
          href="/mentions-legales"
          style={{ color: DIM, textDecoration: "none" }}
        >
          Mentions légales
        </Link>
      </div>
    </footer>
  );
}

function OpMindLogo() {
  return (
    <svg
      viewBox="0 0 130 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OpMind"
      style={{ height: 26, width: "auto" }}
    >
      <text
        x="0"
        y="25"
        fontFamily="'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif"
        fontSize="28"
        fontWeight="800"
        letterSpacing="-0.5"
        fill={INK}
      >
        OpMind<tspan fill={ACCENT}>.</tspan>
      </text>
    </svg>
  );
}

/* ──────────────  Inline style helpers  ────────────── */

const paragraphStyle: CSSProperties = {
  fontFamily: FONT_BODY,
  fontSize: 15,
  lineHeight: 1.7,
  color: INK,
  margin: 0,
};

const strongStyle: CSSProperties = {
  color: INK,
  fontWeight: 600,
};

const linkStyle: CSSProperties = {
  color: INK,
  textDecoration: "underline",
  textDecorationColor: ACCENT,
  textUnderlineOffset: 2,
};
