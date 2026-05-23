"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { Sidebar, MobileTopbar } from "@/components/dashboard/Sidebar";

type Status = "checking" | "authed" | "anon" | "forbidden";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setStatus("anon");
        router.replace("/login");
        return;
      }
      const { data: profile } = await sb
        .from("profiles")
        .select("role,is_admin")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const role = profile?.role ?? null;
      if (role !== "instructor" && !profile?.is_admin) {
        setStatus("forbidden");
        return;
      }
      setStatus("authed");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === "forbidden") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[#E84040]">
          Accès refusé
        </p>
        <h1 className="font-mono text-2xl font-bold uppercase tracking-tight text-white">
          Espace réservé aux instructeurs
        </h1>
        <p className="max-w-md font-mono text-xs uppercase tracking-[0.22em] text-[#666]">
          Ton compte n&apos;a pas les droits nécessaires.
        </p>
        <button
          type="button"
          onClick={async () => {
            await getSupabase().auth.signOut();
            router.replace("/login");
          }}
          className="mt-4 border border-[#7A0000] bg-transparent px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#7A0000]"
        >
          Se déconnecter
        </button>
      </main>
    );
  }

  if (status !== "authed") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[#666]">
          Vérification...
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white md:flex">
      <Sidebar />
      <MobileTopbar />
      <div aria-hidden className="hidden shrink-0 md:block md:w-56" />
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
