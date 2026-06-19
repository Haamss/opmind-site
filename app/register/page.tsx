"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import { ROLE_OPTIONS } from "../../lib/roles";
import styles from "./register.module.css";

const MARQUEE_WORDS = [
  "Précision",
  "Cadence",
  "Contrôle",
  "Sang-froid",
  "Répétition",
  "Focus",
];

/** Force du mot de passe, score 0-4 (signal de force, pas la marque). */
function passwordScore(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  return score;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const [role, setRole] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [cgu, setCgu] = useState(false);
  const [rgpd, setRgpd] = useState(false);

  const score = passwordScore(pwd);
  const meterClass = score > 0 ? styles[`s${score}`] : "";
  const matchState = pwd2.length === 0 ? "" : pwd === pwd2 ? "match" : "nomatch";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const fd = new FormData(e.currentTarget);
    const firstName = String(fd.get("first_name") ?? "").trim();
    const lastName = String(fd.get("last_name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();

    if (!firstName || !lastName) {
      setError("Prénom et nom obligatoires.");
      return;
    }
    if (!role) {
      setError("Choisis ton rôle.");
      return;
    }
    if (pwd.length < 8) {
      setError("Mot de passe trop court (8 caractères minimum).");
      return;
    }
    if (pwd !== pwd2) {
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
      password: pwd,
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
            Rejoins
            <br />
            l&apos;<span className={styles.accent}>élite.</span>
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
          Inscription sécurisée
        </div>

        <div className={styles.formWrap}>
          <h2 className={styles.formTitle}>Inscription</h2>
          <p className={styles.formDesc}>Crée ton espace tireur professionnel</p>

          <form onSubmit={onSubmit} autoComplete="on" noValidate>
            <div className={`${styles.field} ${styles.grid2}`}>
              <div>
                <label htmlFor="first_name">Prénom</label>
                <div className={styles.inputShell}>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    placeholder="Alex"
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="last_name">Nom</label>
                <div className={styles.inputShell}>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    placeholder="Martin"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <div className={styles.inputShell}>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="prenom.nom@unite.fr"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="role">Rôle</label>
              <div className={styles.inputShell}>
                <select
                  id="role"
                  name="role"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="" disabled>
                    Choisir un rôle
                  </option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <span className={styles.selectCaret}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
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
                  autoComplete="new-password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
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
              <div className={`${styles.pwMeter} ${meterClass}`} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password2">Confirmer le mot de passe</label>
              <div className={styles.inputShell}>
                <input
                  type={showPwd ? "text" : "password"}
                  id="password2"
                  name="password2"
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
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
              <div
                className={`${styles.pwHint} ${
                  matchState ? styles[matchState] : ""
                }`}
                aria-live="polite"
              >
                {matchState === "match"
                  ? "Les mots de passe correspondent"
                  : matchState === "nomatch"
                    ? "Les mots de passe ne correspondent pas"
                    : ""}
              </div>
            </div>

            <div className={styles.consents}>
              <label className={styles.consent}>
                <input
                  type="checkbox"
                  name="cgu"
                  checked={cgu}
                  onChange={(e) => setCgu(e.target.checked)}
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
                <span className={styles.lbl}>
                  J&apos;accepte les{" "}
                  <Link href="/cgu">conditions d&apos;utilisation</Link>
                </span>
              </label>
              <label className={styles.consent}>
                <input
                  type="checkbox"
                  name="rgpd"
                  checked={rgpd}
                  onChange={(e) => setRgpd(e.target.checked)}
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
                <span className={styles.lbl}>
                  Je consens au{" "}
                  <Link href="/confidentialite">traitement de mes données</Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={loading}
            >
              {loading ? "Création en cours..." : "Créer mon compte"}
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
          </form>

          <div className={styles.signup}>
            Déjà un compte ? <Link href="/login">Se connecter</Link>
          </div>
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
