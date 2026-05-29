import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/* ──────────────  Tokens  ────────────── */

const BG = "#0a0a0c";
const SURFACE = "#131318";
const ACCENT = "#7A0000";
const INK = "#ebe5d2";
const DIM = "rgba(235,229,210,0.45)";
const DIM_STRONG = "rgba(235,229,210,0.65)";
const LINE = "rgba(235,229,210,0.08)";

const FONT_DISPLAY = "Antonio, 'Barlow Condensed', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Rajdhani', monospace";
const FONT_BODY = "'Barlow', system-ui, sans-serif";

const GRID_BG: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(235,229,210,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(235,229,210,0.04) 1px, transparent 1px)",
  backgroundSize: "80px 80px",
};

/* ──────────────  Page  ────────────── */

export default function InstructorsPage() {
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
      <Hero />
      <Problem />
      <Solution />
      <PourQui />
      <CreatorPromo />
      <FinalCTA />
      <Footer />
    </main>
  );
}

/* ──────────────  Top bar (logo gauche + Se connecter droite)  ────────────── */

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

/* ──────────────  Section 1: Hero  ────────────── */

function Hero() {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "120px 48px 80px",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          ...GRID_BG,
          pointerEvents: "none",
          maskImage:
            "radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)",
        }}
      />
      <div
        style={{
          position: "relative",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <SectionTag>Pour les instructeurs</SectionTag>

        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(64px, 10vw, 140px)",
            fontWeight: 700,
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            color: INK,
            margin: "32px 0 0 0",
          }}
        >
          L&apos;outil que vos
          <br />
          <span style={{ color: ACCENT }}>tireurs attendent.</span>
        </h1>

        <p
          style={{
            marginTop: 40,
            maxWidth: 640,
            fontFamily: FONT_MONO,
            fontSize: 13,
            lineHeight: 1.7,
            letterSpacing: "0.04em",
            color: DIM_STRONG,
          }}
        >
          Structurez vos séances, mesurez la progression de chaque tireur,
          concevez vos stages. OpMind donne à vos élèves les outils qu&apos;ils
          n&apos;ont pas encore.
        </p>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <CtaPrimary href="/register">
            Demander un accès instructeur
          </CtaPrimary>
          <CtaGhost href="/run-the-stage.html">Voir la démo →</CtaGhost>
        </div>
      </div>
    </section>
  );
}

/* ──────────────  Section 2: Problème  ────────────── */

function Problem() {
  const items = [
    {
      title: "Pas de mesure",
      body:
        "Un tireur qui progresse vite ne sait pas pourquoi. Un tireur qui stagne non plus.",
    },
    {
      title: "Pas de méthode",
      body:
        "Les séances libres ne construisent pas. Elles entretiennent les mauvaises habitudes.",
    },
    {
      title: "Pas de traçabilité",
      body:
        "Sans historique, impossible de voir la progression sur 3 mois. Ni de l'expliquer.",
    },
  ];

  return (
    <SectionWrap bg="#0d0d12" tag="01 — Le constat">
      <SectionTitle>
        Ce que l&apos;entraînement instinctif
        <br />
        <span style={{ color: ACCENT }}>ne résout pas.</span>
      </SectionTitle>
      <div
        style={{
          marginTop: 64,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24,
        }}
      >
        {items.map((it) => (
          <ProblemCard key={it.title} title={it.title} body={it.body} />
        ))}
      </div>
    </SectionWrap>
  );
}

function ProblemCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        background: BG,
        border: `1px solid ${LINE}`,
        padding: 32,
        position: "relative",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 32,
          height: 2,
          background: ACCENT,
        }}
      />
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 24,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          color: INK,
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          marginTop: 16,
          fontFamily: FONT_BODY,
          fontSize: 15,
          lineHeight: 1.55,
          color: DIM_STRONG,
          margin: 0,
          marginBlockStart: 16,
        }}
      >
        {body}
      </p>
    </div>
  );
}

/* ──────────────  Section 3: Solution  ────────────── */

function Solution() {
  const features = [
    {
      label: "01",
      title: "Séances structurées",
      body:
        "15 séances Basique progressives. Échauffement, tir, restitution. Chaque bloc est défini.",
    },
    {
      label: "02",
      title: "Suivi par tireur",
      body:
        "Chaque élève a son historique. Vous voyez qui progresse, qui stagne, et sur quoi.",
    },
    {
      label: "03",
      title: "Créateur de stages",
      body:
        "Concevez vos stages en 3D, exportez en PDF, importez directement dans l'app.",
    },
    {
      label: "04",
      title: "Données réelles",
      body:
        "Hit factor, accuracy, splits, par time. Pas des impressions — des chiffres.",
    },
  ];

  return (
    <SectionWrap bg={BG} tag="02 — La méthode">
      <SectionTitle>
        OpMind structure
        <br />
        <span style={{ color: ACCENT }}>ce que vous enseignez.</span>
      </SectionTitle>
      <div
        style={{
          marginTop: 64,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}
      >
        {features.map((f) => (
          <FeatureCard key={f.label} {...f} />
        ))}
      </div>
    </SectionWrap>
  );
}

function FeatureCard({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${LINE}`,
        padding: 40,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: ACCENT,
        }}
      >
        {label}
      </span>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 32,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          color: INK,
          margin: 0,
          lineHeight: 1,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 15,
          lineHeight: 1.55,
          color: DIM_STRONG,
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  );
}

/* ──────────────  Section 4: Pour qui  ────────────── */

function PourQui() {
  const profiles = [
    {
      title: "Instructeur club",
      body:
        "Tu formes des tireurs IPSC ou sportifs. Tu veux voir leur progression entre les séances.",
    },
    {
      title: "Instructeur militaire / LE",
      body:
        "Tu gères des groupes. Tu as besoin de traçabilité et de méthode reproductible.",
    },
    {
      title: "Responsable de club",
      body:
        "Tu supervises plusieurs instructeurs. Tu veux une vue d'ensemble sur ton club.",
    },
  ];

  return (
    <SectionWrap bg="#0d0d12" tag="03 — Pour qui">
      <SectionTitle>
        Conçu pour les
        <br />
        <span style={{ color: ACCENT }}>professionnels du tir.</span>
      </SectionTitle>
      <div
        style={{
          marginTop: 64,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 0,
          border: `1px solid ${LINE}`,
          background: LINE,
        }}
      >
        {profiles.map((p, i) => (
          <ProfileCard
            key={p.title}
            index={String(i + 1).padStart(2, "0")}
            title={p.title}
            body={p.body}
          />
        ))}
      </div>
    </SectionWrap>
  );
}

function ProfileCard({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        background: BG,
        padding: 40,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.24em",
          color: ACCENT,
        }}
      >
        — {index}
      </span>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 26,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          color: INK,
          margin: 0,
          lineHeight: 1.05,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 15,
          lineHeight: 1.55,
          color: DIM_STRONG,
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  );
}

/* ──────────────  Section 5: Créateur de stages  ────────────── */

function CreatorPromo() {
  const points = [
    "Cibles papier, steel, no-shoot, hard cover",
    "Flèches de séquence, murs, ports, tonneaux",
    "Export PDF format match book — compatible import OpMind",
  ];

  return (
    <section
      style={{
        background: BG,
        padding: "120px 48px",
        textAlign: "center",
        borderTop: `1px solid ${LINE}`,
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <SectionTag>04 — Outil intégré</SectionTag>
        <h2
          style={{
            marginTop: 24,
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(40px, 6vw, 80px)",
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            color: INK,
          }}
        >
          Dessinez vos stages.
          <br />
          <span style={{ color: ACCENT }}>Briefez en 30 secondes.</span>
        </h2>
        <p
          style={{
            marginTop: 24,
            fontFamily: FONT_MONO,
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: DIM_STRONG,
          }}
        >
          Outil web 3D intégré · compatible IPSC · export PDF direct
        </p>

        <div
          style={{
            marginTop: 56,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <a
            href="/stage-creator.html"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: "22px 36px",
              background: ACCENT,
              color: "#fff",
              fontFamily: FONT_MONO,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              textDecoration: "none",
              border: `1px solid ${ACCENT}`,
            }}
          >
            Ouvrir le créateur →
          </a>
        </div>

        <div
          style={{
            marginTop: 64,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            textAlign: "left",
            maxWidth: 960,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {points.map((p, i) => (
            <div
              key={p}
              style={{
                padding: "20px 24px",
                borderLeft: `2px solid ${ACCENT}`,
                background: SURFACE,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  letterSpacing: "0.24em",
                  color: ACCENT,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: INK,
                }}
              >
                {p}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────  Section 6: Final CTA  ────────────── */

function FinalCTA() {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 48px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          ...GRID_BG,
          maskImage:
            "radial-gradient(ellipse at 50% 50%, black 20%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 50%, black 20%, transparent 70%)",
        }}
      />
      <div style={{ position: "relative", maxWidth: 1100 }}>
        <SectionTag>05 — Bêta privée</SectionTag>
        <h2
          style={{
            marginTop: 32,
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(56px, 9vw, 120px)",
            fontWeight: 700,
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            color: INK,
          }}
        >
          Prêt à structurer
          <br />
          <span style={{ color: ACCENT }}>votre programme ?</span>
        </h2>

        <div
          style={{
            marginTop: 56,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <CtaPrimary href="/register" large>
            Demander un accès instructeur →
          </CtaPrimary>
        </div>

        <p
          style={{
            marginTop: 24,
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: DIM,
          }}
        >
          Accès bêta sur invitation · Réponse sous 48h
        </p>
      </div>
    </section>
  );
}

/* ──────────────  Footer  ────────────── */

function Footer() {
  return (
    <footer
      style={{
        padding: "32px 48px",
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
      <span>FS-001 / Beta · Approved</span>
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

/* ──────────────  Shared blocks  ────────────── */

function SectionWrap({
  bg,
  tag,
  children,
}: {
  bg: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: bg,
        padding: "120px 48px",
        borderTop: `1px solid ${LINE}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {tag && <SectionTag>{tag}</SectionTag>}
        <div style={{ marginTop: tag ? 24 : 0 }}>{children}</div>
      </div>
    </section>
  );
}

function SectionTag({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: ACCENT,
        margin: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 32,
          height: 1,
          background: ACCENT,
        }}
      />
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: "clamp(40px, 6vw, 88px)",
        fontWeight: 700,
        lineHeight: 0.98,
        letterSpacing: "-0.03em",
        textTransform: "uppercase",
        color: INK,
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

function CtaPrimary({
  href,
  children,
  large = false,
}: {
  href: string;
  children: ReactNode;
  large?: boolean;
}) {
  const isExternal = href.endsWith(".html") || href.startsWith("http");
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    background: ACCENT,
    color: "#fff",
    padding: large ? "22px 36px" : "18px 28px",
    fontFamily: FONT_MONO,
    fontSize: large ? 13 : 12,
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    textDecoration: "none",
    border: `1px solid ${ACCENT}`,
  };
  if (isExternal) {
    return (
      <a href={href} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} style={style}>
      {children}
    </Link>
  );
}

function CtaGhost({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const isExternal = href.endsWith(".html") || href.startsWith("http");
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    background: "transparent",
    color: INK,
    padding: "18px 28px",
    fontFamily: FONT_MONO,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    textDecoration: "none",
    border: "1px solid rgba(235,229,210,0.2)",
  };
  if (isExternal) {
    return (
      <a href={href} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} style={style}>
      {children}
    </Link>
  );
}

/* ──────────────  Logo  ────────────── */

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
