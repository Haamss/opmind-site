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
  title: "Politique de confidentialité — OpMind",
  description:
    "Politique de confidentialité OpMind — données collectées, finalités, durée de conservation, droits RGPD.",
};

/* ──────────────  Page  ────────────── */

export default function ConfidentialitePage() {
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
        <PageTitle>Politique de confidentialité</PageTitle>

        <LegalSection title="Données collectées">
          <p style={paragraphStyle}>
            Lors de la création d&apos;un compte OpMind, nous collectons les
            informations suivantes :
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>Adresse email</li>
            <li style={listItemStyle}>Prénom</li>
            <li style={listItemStyle}>Nom</li>
            <li style={listItemStyle}>Rôle (tireur sportif, instructeur, responsable de club)</li>
          </ul>
          <p style={paragraphStyle}>
            Aucune donnée sensible (santé, opinions, etc.) n&apos;est collectée.
          </p>
        </LegalSection>

        <LegalSection title="Finalité du traitement">
          <p style={paragraphStyle}>
            Les données collectées sont utilisées pour :
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              Te donner accès à l&apos;application OpMind
            </li>
            <li style={listItemStyle}>
              Communiquer sur le lancement, les évolutions et les invitations à
              la bêta
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Base légale">
          <p style={paragraphStyle}>
            Le traitement repose sur ton{" "}
            <strong style={strongStyle}>consentement explicite</strong>
            {" "}— RGPD article 6.1.a. Tu peux le retirer à tout moment.
          </p>
        </LegalSection>

        <LegalSection title="Durée de conservation">
          <p style={paragraphStyle}>
            Les données sont conservées jusqu&apos;à la suppression de ton
            compte ou après <strong style={strongStyle}>3 ans d&apos;inactivité</strong>,
            selon la première éventualité.
          </p>
        </LegalSection>

        <LegalSection title="Tes droits">
          <p style={paragraphStyle}>
            Conformément au RGPD, tu disposes des droits suivants sur tes
            données :
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>Droit d&apos;accès</li>
            <li style={listItemStyle}>Droit de rectification</li>
            <li style={listItemStyle}>Droit à l&apos;effacement (suppression)</li>
            <li style={listItemStyle}>Droit à la portabilité</li>
            <li style={listItemStyle}>Droit d&apos;opposition</li>
          </ul>
          <p style={paragraphStyle}>
            Pour exercer ces droits, écris à{" "}
            <a href="mailto:opmind.strat@gmail.com" style={linkStyle}>
              opmind.strat@gmail.com
            </a>
            . Une réponse te sera apportée sous 30 jours.
          </p>
        </LegalSection>

        <LegalSection title="Sous-traitants">
          <p style={paragraphStyle}>
            Pour fournir le service, nous utilisons les sous-traitants suivants :
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <strong style={strongStyle}>Supabase</strong> — Base de données et
              authentification. Données hébergées dans l&apos;Union européenne.
            </li>
            <li style={listItemStyle}>
              <strong style={strongStyle}>GitHub Pages</strong> — Hébergement du
              site. Données transférées aux États-Unis (clauses contractuelles
              types).
            </li>
          </ul>
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

const listStyle: CSSProperties = {
  fontFamily: FONT_BODY,
  fontSize: 15,
  lineHeight: 1.7,
  color: INK,
  margin: 0,
  paddingLeft: 20,
  listStyle: "disc",
};

const listItemStyle: CSSProperties = {
  marginTop: 4,
};
