"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

const NAV = [
  {
    href: "/dashboard",
    label: "Vue d'ensemble",
    exact: true,
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    exact: false,
    icon: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
  },
  {
    href: "/dashboard/assignments",
    label: "Assignations",
    exact: false,
    icon: (
      <>
        <polyline points="20 6 9 17 4 12" />
      </>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await getSupabase().auth.signOut();
    router.replace("/");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-[#1A1A1A] bg-black md:flex">
      <div className="border-b border-[#1A1A1A] px-6 py-6">
        <Link href="/" aria-label="Accueil OpMind" className="block transition hover:opacity-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OpMind" className="h-8 w-auto" />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col py-4">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href || pathname === item.href + "/"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                active
                  ? "bg-[#0A0A0A] text-white"
                  : "text-[#888] hover:bg-[#0A0A0A] hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute inset-y-0 left-0 w-[3px] bg-[#7A0000]" />
              )}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="square"
              >
                {item.icon}
              </svg>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="my-4 mx-6 h-px bg-[#1A1A1A]" />

        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="flex items-center gap-3 px-6 py-3 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#888] transition-colors hover:bg-[#0A0A0A] hover:text-[#E84040] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {signingOut ? "..." : "Déconnexion"}
        </button>
      </nav>
    </aside>
  );
}

export function MobileTopbar() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await getSupabase().auth.signOut();
    router.replace("/");
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#1A1A1A] bg-black px-4 py-3 md:hidden">
      <Link href="/" aria-label="Accueil OpMind">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="OpMind" className="h-7 w-auto" />
      </Link>
      <nav className="flex items-center gap-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">
        <Link href="/dashboard" className="text-white">Vue</Link>
        <Link href="/dashboard/analytics" className="text-[#888]">Analytics</Link>
        <Link href="/dashboard/assignments" className="text-[#888]">Assign.</Link>
        <button onClick={onSignOut} className="text-[#E84040]" disabled={signingOut}>
          {signingOut ? "..." : "Sortir"}
        </button>
      </nav>
    </header>
  );
}
