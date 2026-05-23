import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Rajdhani } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OpMind — Structure ton tir. Analyse. Progresse.",
  description:
    "OpMind est l'application d'entraînement au tir pensée pour les tireurs exigeants. Séances structurées, shot timer, analyse de performances, historique complet.",
  keywords: [
    "tir sportif",
    "IPSC",
    "shot timer",
    "entraînement tir",
    "application tir",
    "dry fire",
    "progression",
  ],
  metadataBase: new URL("https://opmind.fr"),
  openGraph: {
    title: "OpMind — Entraîne-toi comme un professionnel",
    description:
      "Structure tes séances de tir, analyse chaque performance, progresse avec méthode.",
    url: "https://opmind.fr",
    siteName: "OpMind",
    locale: "fr_FR",
    type: "website",
  },
};

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https://iqhbxzhpndaeivrzdzyy.supabase.co wss://iqhbxzhpndaeivrzdzyy.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${barlow.variable} ${barlowCondensed.variable} ${rajdhani.variable}`}
    >
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body>{children}</body>
    </html>
  );
}
