"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import styles from "./login.module.css";

const MARQUEE_WORDS = [
  "Précision",
  "Cadence",
  "Contrôle",
  "Sang-froid",
  "Répétition",
  "Focus",
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("opmind_remember_email");
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* localStorage indisponible */
    }
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const emailValue = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    try {
      if (remember && emailValue) {
        localStorage.setItem("opmind_remember_email", emailValue);
      } else {
        localStorage.removeItem("opmind_remember_email");
      }
    } catch {
      /* localStorage indisponible */
    }

    const { error: signInError } = await getSupabase().auth.signInWithPassword({
      email: emailValue,
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

  async function onForgot() {
    setError(null);
    setInfo(null);
    const target = email.trim();
    if (!target) {
      setError("Entre ton email pour recevoir le lien de réinitialisation.");
      return;
    }
    const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(
      target
    );
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo("Lien de réinitialisation envoyé. Vérifie ta boîte mail.");
  }

  return (
    <main className={styles.auth}>
      {/* COLONNE GAUCHE — typo cinetique */}
      <section className={styles.typePane}>
        <div className={styles.typeTop}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OpMind" />
        </div>
        <div className={styles.marquee} aria-hidden="true">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className={`${styles.typeOv} ${styles.v}`} />
        <div className={`${styles.typeOv} ${styles.h}`} />
        <div className={styles.typeHeadline}>
          <div className={styles.eyebrow}>L&apos;entraînement du tireur pro</div>
          <h1 className={styles.lead}>
            Structure
            <br />
            ton <span className={styles.accent}>tir.</span>
          </h1>
        </div>
      </section>

      {/* COLONNE DROITE — formulaire */}
      <section className={styles.formPane}>
        <div className={styles.formTop}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="4"
              y="10"
              width="16"
              height="11"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M8 10V7a4 4 0 0 1 8 0v3"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
          Connexion sécurisée
        </div>

        <div className={styles.formWrap}>
          <h2 className={styles.formTitle}>Connexion</h2>
          <p className={styles.formDesc}>Espace tireur professionnel</p>

          <form onSubmit={onSubmit} autoComplete="on" noValidate>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <div className={styles.inputShell}>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="prenom.nom@unite.fr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Mot de passe</label>
              <div className={styles.inputShell}>
                <input
                  type={showPwd ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.togglePw}
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={
                    showPwd
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  aria-pressed={showPwd}
                >
                  {showPwd ? <EyeOffIcon /> : <EyeOpenIcon />}
                </button>
              </div>
            </div>

            <div className={styles.rowBetween}>
              <label className={styles.remember}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className={styles.checkBox}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 12l5 5L20 6"
                      stroke="currentColor"
                      strokeWidth="2.4"
                    />
                  </svg>
                </span>
                <span className={styles.lbl}>Se souvenir de moi</span>
              </label>
              <button
                type="button"
                className={styles.forgot}
                onClick={onForgot}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={loading}
            >
              {loading ? "Connexion en cours..." : "Se connecter"}
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </button>

            {error && (
              <p role="alert" className={`${styles.msg} ${styles.msgError}`}>
                {error}
              </p>
            )}
            {info && (
              <p role="status" className={`${styles.msg} ${styles.msgOk}`}>
                {info}
              </p>
            )}
          </form>

          <div className={styles.signup}>
            Pas encore de compte ? <Link href="/register">Demander un accès</Link>
          </div>
        </div>

        <div className={styles.formFoot}>
          Chiffré AES-256 · Conforme RGPD · Hébergé en France
        </div>
      </section>
    </main>
  );
}

function EyeOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3 3.6M6.3 7.8A17 17 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 3.3-.6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9.5 10.4a3 3 0 0 0 4.1 4.2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
