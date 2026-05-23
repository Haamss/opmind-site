"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "");
    const { error: signUpError } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { name } },
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
    setSuccess(true);
    setLoading(false);
  }

  return (
    <main className="grid min-h-screen bg-black lg:grid-cols-2">
      {/* LEFT — image + overlay + logo + tagline */}
      <aside className="relative isolate hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-shooter.jpg"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/60" />

        <div className="relative z-10 flex max-w-md flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OpMind" className="h-28 w-auto" />
          <p className="mt-14 font-mono text-3xl font-bold uppercase leading-[1.15] tracking-tight text-white md:text-4xl">
            Rejoins la communauté
            <br />
            <span className="text-[#7A0000]">des tireurs exigeants.</span>
          </p>
          <div className="mt-10 h-px w-24 bg-[#7A0000]" />
          <p className="mt-10 font-mono text-xs uppercase tracking-[0.25em] text-[#888]">
            Bêta privée · 2026
          </p>
        </div>
      </aside>

      {/* RIGHT — form on #0A0A0A */}
      <section className="relative flex items-center justify-center bg-[#0A0A0A] px-6 py-16 md:px-12 md:py-20">
        {/* Mobile-only header */}
        <Link
          href="/"
          className="absolute left-1/2 top-10 -translate-x-1/2 transition hover:opacity-80 lg:hidden"
          aria-label="Retour à l'accueil"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OpMind" className="h-16 w-auto" />
        </Link>

        <div className="w-full max-w-md">
          <h1 className="font-mono text-5xl font-bold uppercase tracking-tight text-white md:text-6xl">
            S'inscrire
          </h1>
          <p className="mt-4 text-base font-light text-[#888]">
            Crée ton compte et accède à la bêta.
          </p>

          {success ? (
            <div className="mt-14 border border-l-4 border-[#7A0000] bg-[#7A0000]/15 px-6 py-8">
              <p className="font-mono text-base font-bold uppercase tracking-tight text-white">
                Vérifie ta boîte mail
              </p>
              <p className="mt-3 text-sm font-light text-[#888]">
                On t'a envoyé un lien pour confirmer ton compte.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-14 space-y-8">
              <Field
                label="Nom"
                type="text"
                name="name"
                placeholder="Ton nom"
                autoComplete="name"
              />
              <Field
                label="Email"
                type="email"
                name="email"
                placeholder="ton@email.fr"
                autoComplete="email"
              />
              <Field
                label="Mot de passe"
                type="password"
                name="password"
                placeholder="••••••••"
                autoComplete="new-password"
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full bg-[#7A0000] py-4 font-mono text-lg font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#5A0000] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Inscription..." : "S'inscrire"}
              </button>

              {error && (
                <p
                  role="alert"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-red-400"
                >
                  {error}
                </p>
              )}
            </form>
          )}

          <p className="mt-12 text-center text-sm text-[#888]">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-mono font-semibold uppercase tracking-wider text-white transition-colors hover:text-[#7A0000]"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  type,
  name,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#888]">
        {label}
      </span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="mt-3 block w-full border-b border-[#333] bg-transparent py-4 font-sans text-base text-white placeholder:text-[#555] transition-colors focus:border-[#7A0000] focus:outline-none"
      />
    </label>
  );
}
