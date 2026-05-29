"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const { error: signInError } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      const m = signInError.message;
      setError(
        /invalid login credentials/i.test(m)
          ? "Email ou mot de passe incorrect."
          : m
      );
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        fontFamily: "var(--font-geist-sans), sans-serif",
      }}
    >
      {/* COLONNE GAUCHE */}
      <aside
        style={{
          width: "40%",
          height: "100%",
          background: "#0a0a0c",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 64px",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div style={{ position: "absolute", top: 32, left: 32 }}>
          <OpMindLogo />
        </div>
        <h1
          style={{
            fontFamily: "Antonio, sans-serif",
            fontSize: "clamp(48px, 5vw, 80px)",
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            color: "#ebe5d2",
            margin: 0,
          }}
        >
          BON<br />RETOUR.
        </h1>
        <p
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(235,229,210,0.45)",
            marginTop: 16,
          }}
        >
          TON ENTRAÎNEMENT T&apos;ATTEND.
        </p>
      </aside>

      {/* COLONNE DROITE */}
      <div
        style={{
          flex: 1,
          height: "100%",
          background: "#0d0d12",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 64px",
          overflowY: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h2 className="font-mono text-2xl font-bold uppercase tracking-[0.2em] text-[#ebe5d2]">
            Connexion
          </h2>

          <form onSubmit={onSubmit} className="mt-12 space-y-7" noValidate>
            <label className="block">
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#888]">
                Email
              </span>
              <input
                type="email"
                name="email"
                placeholder="ton@email.fr"
                autoComplete="email"
                required
                className="mt-2 block w-full border-x-0 border-t-0 border-b border-[rgba(235,229,210,0.2)] bg-[#0a0a0c] px-1 py-3 font-mono text-[13px] text-[#ebe5d2] placeholder:text-[#555] transition-colors focus:border-[#7A0000] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#888]">
                Mot de passe
              </span>
              <div className="relative mt-2">
                <input
                  type={showPwd ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="block w-full border-x-0 border-t-0 border-b border-[rgba(235,229,210,0.2)] bg-[#0a0a0c] px-1 py-3 pr-10 font-mono text-[13px] text-[#ebe5d2] placeholder:text-[#555] transition-colors focus:border-[#7A0000] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-2 text-[#888] transition-colors hover:text-[#ebe5d2]"
                  aria-label={
                    showPwd
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  aria-pressed={showPwd}
                >
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7A0000] px-4 py-[14px] font-mono text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#5A0000] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Connexion en cours..." : "Se connecter"}
            </button>

            {error && (
              <p
                role="alert"
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#e84a3a]"
              >
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <Link
                href="#"
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#888] transition hover:text-[#ebe5d2]"
              >
                Mot de passe oublié ?
              </Link>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#888]">
                Pas encore de compte ?{" "}
                <Link
                  href="/register"
                  className="text-[#ebe5d2] transition hover:text-[#7A0000]"
                >
                  S&apos;inscrire →
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function OpMindLogo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 130 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OpMind"
      className={className}
    >
      <text
        x="0"
        y="25"
        fontFamily="'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif"
        fontSize="28"
        fontWeight="800"
        letterSpacing="-0.5"
        fill="#ebe5d2"
      >
        OpMind<tspan fill="#7A0000">.</tspan>
      </text>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.7 19.7 0 0 1 4.22-5.43" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.66 19.66 0 0 1-3.36 4.41" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
