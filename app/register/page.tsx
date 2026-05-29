"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type Strength = "empty" | "weak" | "medium" | "strong";

function computeStrength(pwd: string): Strength {
  if (!pwd) return "empty";
  if (pwd.length < 8) return "weak";
  if (pwd.length > 12 && /[A-Z]/.test(pwd) && /\d/.test(pwd)) return "strong";
  return "medium";
}

const STRENGTH_META: Record<
  Strength,
  { label: string; width: string; color: string }
> = {
  empty: { label: "", width: "0%", color: "transparent" },
  weak: { label: "Faible", width: "33%", color: "#e84a3a" },
  medium: { label: "Moyen", width: "66%", color: "#f5a623" },
  strong: { label: "Fort", width: "100%", color: "#5ad99b" },
};

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [pwd, setPwd] = useState("");

  const strength = computeStrength(pwd);
  const meta = STRENGTH_META[strength];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const fd = new FormData(e.currentTarget);
    const firstName = String(fd.get("first_name") ?? "").trim();
    const lastName = String(fd.get("last_name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm_password") ?? "");
    const role = String(fd.get("role") ?? "");
    const cgu = fd.get("cgu") === "on";
    const rgpd = fd.get("rgpd") === "on";

    if (!firstName || !lastName) {
      setError("Prénom et nom obligatoires.");
      return;
    }
    if (!role) {
      setError("Choisis ton rôle.");
      return;
    }
    if (password.length < 8) {
      setError("Mot de passe trop court (8 caractères minimum).");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!cgu || !rgpd) {
      setError("Tu dois accepter les conditions et consentir au traitement RGPD.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, role },
      },
    });

    if (signUpError) {
      const m = signUpError.message;
      setError(
        /already registered|user already|already exists/i.test(m)
          ? "Email déjà utilisé."
          : m
      );
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  const inputClass =
    "mt-2 block w-full border-x-0 border-t-0 border-b border-[rgba(235,229,210,0.2)] bg-[#0a0a0c] px-1 py-3 font-mono text-[13px] text-[#ebe5d2] placeholder:text-[#555] transition-colors focus:border-[#7A0000] focus:outline-none";
  const labelClass =
    "block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#888]";

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
          REJOINS<br />OPMIND.
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
          MESURE TA PROGRESSION. STRUCTURE TON TIR.
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
            Créer un compte
          </h2>

          <form onSubmit={onSubmit} className="mt-12 space-y-6" noValidate>
            {/* First + Last name */}
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={labelClass}>Prénom</span>
                <input
                  type="text"
                  name="first_name"
                  autoComplete="given-name"
                  required
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Nom</span>
                <input
                  type="text"
                  name="last_name"
                  autoComplete="family-name"
                  required
                  className={inputClass}
                />
              </label>
            </div>

            {/* Email */}
            <label className="block">
              <span className={labelClass}>Email</span>
              <input
                type="email"
                name="email"
                placeholder="ton@email.fr"
                autoComplete="email"
                required
                className={inputClass}
              />
            </label>

            {/* Password + strength bar */}
            <label className="block">
              <span className={labelClass}>Mot de passe</span>
              <div className="relative mt-2">
                <input
                  type={showPwd ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
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
              <div className="mt-2 h-[3px] w-full bg-[rgba(235,229,210,0.08)]">
                <div
                  className="h-full transition-all duration-200"
                  style={{ width: meta.width, backgroundColor: meta.color }}
                />
              </div>
              {strength !== "empty" && (
                <p
                  className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </p>
              )}
            </label>

            {/* Confirm password */}
            <label className="block">
              <span className={labelClass}>Confirmer mot de passe</span>
              <input
                type={showPwd ? "text" : "password"}
                name="confirm_password"
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </label>

            {/* Role */}
            <label className="block">
              <span className={labelClass}>Rôle</span>
              <select
                name="role"
                required
                defaultValue=""
                className="mt-2 block w-full appearance-none border-x-0 border-t-0 border-b border-[rgba(235,229,210,0.2)] bg-[#0a0a0c] px-1 py-3 pr-8 font-mono text-[13px] text-[#ebe5d2] transition-colors focus:border-[#7A0000] focus:outline-none"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 4px center",
                  backgroundSize: "12px",
                }}
              >
                <option value="" disabled>
                  Choisir un rôle
                </option>
                <option value="shooter">TIREUR SPORTIF</option>
                <option value="instructor">INSTRUCTEUR</option>
                <option value="club_manager">RESPONSABLE DE CLUB</option>
              </select>
            </label>

            {/* Checkboxes — CGU + RGPD */}
            <div className="space-y-3 pt-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="cgu"
                  required
                  className="mt-[2px] h-4 w-4 cursor-pointer appearance-none border border-[rgba(235,229,210,0.3)] bg-transparent transition-colors checked:border-[#7A0000] checked:bg-[#7A0000] focus:outline-none"
                />
                <span className="font-mono text-[11px] leading-relaxed text-[#888]">
                  J&apos;accepte les{" "}
                  <Link
                    href="/cgu"
                    className="text-[#ebe5d2] underline decoration-[#7A0000] underline-offset-2 transition hover:decoration-[#ebe5d2]"
                  >
                    conditions d&apos;utilisation
                  </Link>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="rgpd"
                  required
                  className="mt-[2px] h-4 w-4 cursor-pointer appearance-none border border-[rgba(235,229,210,0.3)] bg-transparent transition-colors checked:border-[#7A0000] checked:bg-[#7A0000] focus:outline-none"
                />
                <span className="font-mono text-[11px] leading-relaxed text-[#888]">
                  Je consens au{" "}
                  <Link
                    href="/confidentialite"
                    className="text-[#ebe5d2] underline decoration-[#7A0000] underline-offset-2 transition hover:decoration-[#ebe5d2]"
                  >
                    traitement de mes données
                  </Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#7A0000] px-4 py-[14px] font-mono text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#5A0000] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Création en cours..." : "Créer mon compte"}
            </button>

            {error && (
              <p
                role="alert"
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#e84a3a]"
              >
                {error}
              </p>
            )}

            <p className="pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#888]">
              Déjà un compte ?{" "}
              <Link
                href="/login"
                className="text-[#ebe5d2] transition hover:text-[#7A0000]"
              >
                Se connecter →
              </Link>
            </p>
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
