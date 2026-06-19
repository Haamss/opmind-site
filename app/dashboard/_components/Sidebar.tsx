"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { isInstructorRole } from "../../../lib/roles";

const FONT_RAJDHANI =
  "var(--font-rajdhani), 'Rajdhani', system-ui, sans-serif";

type SidebarProfile = {
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  email?: string | null;
};

type NavItem = {
  label: string;
  href: string;
  matchView?: string;
  matchPath?: string;
  badge?: number;
  emphasize?: boolean;
};

export default function DashboardSidebar({
  profile,
  stagesCount,
  sessionsCount,
  shootersCount,
}: {
  profile: SidebarProfile | null;
  stagesCount: number;
  sessionsCount: number;
  shootersCount: number;
}) {
  const pathname = usePathname() || "/dashboard";
  const searchParams = useSearchParams();
  const view = searchParams?.get("view") || "";
  const onDashboardRoot = pathname === "/dashboard";
  const currentView = onDashboardRoot ? view || "home" : "";

  const matches = (it: NavItem): boolean => {
    if (it.matchPath) return pathname === it.matchPath;
    if (it.matchView) return onDashboardRoot && currentView === it.matchView;
    return false;
  };

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: "Opérations",
      items: [
        {
          label: "Créer une séance",
          href: "/dashboard?view=create_session",
          matchView: "create_session",
          emphasize: true,
        },
        {
          label: "Tableau de bord",
          href: "/dashboard",
          matchView: "home",
        },
        {
          label: "Mes Stages",
          href: "/dashboard?view=stages",
          matchView: "stages",
          badge: stagesCount,
        },
        {
          label: "Sessions",
          href: "/dashboard?view=sessions",
          matchView: "sessions",
          badge: sessionsCount,
        },
      ],
    },
    {
      title: "Analyse",
      items: [
        {
          label: "Performance",
          href: "/dashboard?view=performance",
          matchView: "performance",
        },
        {
          label: "Comparatif",
          href: "/dashboard/comparatif",
          matchPath: "/dashboard/comparatif",
        },
        {
          label: "Mes Tireurs",
          href: "/dashboard/mes-tireurs",
          matchPath: "/dashboard/mes-tireurs",
          badge: shootersCount,
        },
      ],
    },
    {
      title: "Compte",
      items: [
        {
          label: "Profil",
          href: "/dashboard/profil",
          matchPath: "/dashboard/profil",
        },
        {
          label: "Paramètres",
          href: "/dashboard/parametres",
          matchPath: "/dashboard/parametres",
        },
      ],
    },
  ];

  const fn = (profile?.first_name || "").trim();
  const ln = (profile?.last_name || "").trim();
  const initial = (fn.charAt(0) || ln.charAt(0) || "H").toUpperCase();
  const displayName = (
    fn ||
    (profile?.email ? profile.email.split("@")[0] : "OpMind")
  ).toUpperCase();
  const role = (profile?.role || "shooter").toLowerCase();
  const roleLabel = isInstructorRole(role)
    ? "Instructeur · Pro"
    : role === "club_manager"
      ? "Responsable · Club"
      : "Tireur";

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 220,
        background: "#0d0d0d",
        borderRight: "1px solid #1a1a1a",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        fontFamily: FONT_RAJDHANI,
      }}
    >
      {/* Logo + version */}
      <div
        style={{
          padding: "20px 20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <OpMindLogo />
        <span
          style={{
            fontFamily: FONT_RAJDHANI,
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.1em",
            color: "#555",
            border: "1px solid #1a1a1a",
            padding: "1px 5px",
            textTransform: "uppercase",
          }}
        >
          v0.9.2
        </span>
      </div>

      {/* Sections */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: 20,
        }}
      >
        {sections.map((s) => (
          <div key={s.title} style={{ marginBottom: 24 }}>
            <div
              style={{
                padding: "0 20px 8px",
                fontFamily: FONT_RAJDHANI,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#444",
              }}
            >
              {s.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {s.items.map((it) => {
                const active = matches(it);
                return (
                  <Link
                    key={it.label}
                    href={it.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 20px",
                      fontFamily: FONT_RAJDHANI,
                      fontSize: 12,
                      fontWeight: active ? 600 : 500,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: active ? "#fff" : "#666",
                      textDecoration: "none",
                      borderLeft: active
                        ? "2px solid #7A0000"
                        : "2px solid transparent",
                      background: active
                        ? "rgba(122,0,0,0.06)"
                        : "transparent",
                      transition: "color .15s, background .15s",
                    }}
                  >
                    <span>
                      {it.emphasize ? "+ " : ""}
                      {it.label}
                    </span>
                    {it.badge != null && it.badge > 0 && (
                      <span
                        style={{
                          fontFamily: FONT_RAJDHANI,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          color: active ? "#fff" : "#888",
                          background: active
                            ? "rgba(122,0,0,0.4)"
                            : "#1a1a1a",
                          padding: "1px 6px",
                          borderRadius: 2,
                        }}
                      >
                        {String(it.badge).padStart(2, "0")}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer profile */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #1a1a1a",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            background: "#7A0000",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT_RAJDHANI,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.04em",
            borderRadius: 2,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            gap: 2,
          }}
        >
          <span
            style={{
              fontFamily: FONT_RAJDHANI,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#fff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
          <span
            style={{
              fontFamily: FONT_RAJDHANI,
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#555",
            }}
          >
            {roleLabel}
          </span>
        </div>
      </div>
    </aside>
  );
}

function OpMindLogo() {
  return (
    <svg
      viewBox="0 0 130 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OpMind"
      style={{ height: 22, width: "auto" }}
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
