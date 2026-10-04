import type { Metadata } from "next";
import {
  Barlow,
  Barlow_Condensed,
  Rajdhani,
  Antonio,
  Geist,
  JetBrains_Mono,
} from "next/font/google";
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

const antonio = Antonio({
  variable: "--font-antonio",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OpMind — Chaque séance enregistrée. Chaque séance validée.",
  description:
    "OpMind est le carnet de tir des instructeurs et de leurs tireurs : séances déclarées, validées par l'instructeur avec signature et horodatage, export PDF au format PIA-207 ou FDO.",
  keywords: [
    "carnet de tir",
    "PIA-207",
    "FDO",
    "instructeur de tir",
    "registre de club",
    "traçabilité",
    "validation instructeur",
  ],
  metadataBase: new URL("https://opmind.fr"),
  openGraph: {
    title: "OpMind — Chaque séance enregistrée. Chaque séance validée.",
    description:
      "Le carnet de tir de vos tireurs, tenu séance par séance et validé par l'instructeur. Export PDF au format du livret.",
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
      className={`${barlow.variable} ${barlowCondensed.variable} ${rajdhani.variable} ${antonio.variable} ${geist.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body>{children}</body>
    </html>
  );
}
