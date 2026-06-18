"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { getSupabase } from "@/lib/supabase";
import styles from "@/components/dashboard/dashboard.module.css";

/* ──────────────  Tokens (design system partagé via .page) ────────────── */

const ACCENT = "var(--red)";
const ACCENT_BRIGHT = "var(--red)";
const OK = "var(--green)";
const INK = "var(--ink)";
const INK_DIM = "var(--dim)";
const INK_FAINT = "var(--dim-2)";
const BG = "var(--bg)";
const SURFACE = "var(--surface)";
const SURFACE_DARK = "var(--bg)";
const LINE = "var(--line)";
const INPUT_BORDER = "var(--line-2)";

const FONT_RAJ = "var(--sans)";

/* ──────────────  Types  ────────────── */

type Settings = {
  notifications: {
    session_complete: boolean;
    invitation_accepted: boolean;
    weekly_report: boolean;
    inactive_days: number;
  };
  display: {
    language: "fr" | "en";
    date_format: "dmy" | "mdy";
    units: "m" | "yd";
    shooters_view: "grid" | "list";
  };
};

type ShooterRow = {
  id: string;
  name: string;
  unit?: string | null;
  grade?: string | null;
  status?: string | null;
};

type ManualSessionRow = {
  instructor_shooter_id: string;
  date?: string | null;
  normalized_score?: number | null;
  total_shots?: number | null;
  accuracy?: number | null;
};

type LinkedDevice = { name?: string; last_sync?: string };

const DEFAULT_SETTINGS: Settings = {
  notifications: {
    session_complete: true,
    invitation_accepted: true,
    weekly_report: true,
    inactive_days: 14,
  },
  display: {
    language: "fr",
    date_format: "dmy",
    units: "m",
    shooters_view: "grid",
  },
};

/* ──────────────  Helpers  ────────────── */

function avg(nums: number[]): number {
  const valid = nums.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return 0;
  return valid.reduce((s, n) => s + n, 0) / valid.length;
}

function deriveLevel(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function isoDate(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function csvField(v: string | number): string {
  const s = String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadBlob(filename: string, content: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ──────────────  Page  ────────────── */

export default function ParametresPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [profileData, setProfileData] = useState<Record<string, unknown>>({});

  const [notif, setNotif] = useState(DEFAULT_SETTINGS.notifications);
  const [display, setDisplay] = useState(DEFAULT_SETTINGS.display);
  const [inactiveAlert, setInactiveAlert] = useState(true);
  const [inactiveDays, setInactiveDays] = useState(14);
  const [linkedDevice, setLinkedDevice] = useState<LinkedDevice | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);

  /* ──────  Load  ────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        const {
          data: { session },
        } = await sb.auth.getSession();
        if (!session) {
          router.replace("/login");
          return;
        }
        if (cancelled) return;
        setUserId(session.user.id);

        const { data: prof } = await sb
          .from("profiles")
          .select("profile_data")
          .eq("id", session.user.id)
          .maybeSingle();
        if (cancelled) return;

        const pd =
          ((prof as { profile_data?: Record<string, unknown> } | null)
            ?.profile_data as Record<string, unknown> | null) || {};
        setProfileData(pd);

        const raw = (pd.settings as Partial<Settings> | undefined) || {};
        const n = { ...DEFAULT_SETTINGS.notifications, ...(raw.notifications || {}) };
        const d = { ...DEFAULT_SETTINGS.display, ...(raw.display || {}) };
        setNotif(n);
        setDisplay(d);
        const days = Number(n.inactive_days);
        setInactiveAlert(days > 0);
        setInactiveDays(days > 0 ? Math.min(60, Math.max(1, days)) : 14);

        const ld = pd.linked_device;
        if (ld && typeof ld === "object") {
          setLinkedDevice(ld as LinkedDevice);
        } else if (typeof ld === "string" && ld.trim()) {
          setLinkedDevice({ name: ld });
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /* ──────  Save  ────── */
  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    try {
      const sb = getSupabase();
      const settings: Settings = {
        notifications: {
          session_complete: notif.session_complete,
          invitation_accepted: notif.invitation_accepted,
          weekly_report: notif.weekly_report,
          inactive_days: inactiveAlert ? inactiveDays : 0,
        },
        display,
      };
      const nextProfileData = { ...profileData, settings };
      const { error } = await sb
        .from("profiles")
        .update({ profile_data: nextProfileData })
        .eq("id", userId);
      if (!error) {
        setProfileData(nextProfileData);
        setSaved(true);
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  /* ──────  Exports  ────── */
  async function handleExportJson() {
    if (!userId) return;
    setExporting("json");
    try {
      const sb = getSupabase();
      const [{ data: profile }, { data: sessions }, { data: tireurs }] =
        await Promise.all([
          sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
          sb.from("module_sessions").select("*").eq("user_id", userId),
          sb
            .from("instructor_shooters")
            .select("*")
            .eq("instructor_id", userId),
        ]);
      const payload = {
        exported_at: new Date().toISOString(),
        profile: profile || null,
        sessions: sessions || [],
        tireurs: tireurs || [],
      };
      downloadBlob(
        `opmind-export-${todayStamp()}.json`,
        JSON.stringify(payload, null, 2),
        "application/json"
      );
    } catch {
      /* ignore */
    } finally {
      setExporting(null);
    }
  }

  async function handleExportCsv() {
    if (!userId) return;
    setExporting("csv");
    try {
      const sb = getSupabase();
      const { data: rows } = await sb
        .from("instructor_shooters")
        .select("id,name,unit,grade,status")
        .eq("instructor_id", userId);
      const shooters = (rows as ShooterRow[] | null) || [];
      const ids = shooters.map((s) => s.id);

      const sessionsByShooter: Record<string, ManualSessionRow[]> = {};
      if (ids.length > 0) {
        const { data: sess } = await sb
          .from("manual_sessions")
          .select("instructor_shooter_id,date,normalized_score,total_shots,accuracy")
          .in("instructor_shooter_id", ids);
        for (const s of (sess as ManualSessionRow[] | null) || []) {
          const k = s.instructor_shooter_id;
          if (!sessionsByShooter[k]) sessionsByShooter[k] = [];
          sessionsByShooter[k].push(s);
        }
      }

      const header = [
        "nom",
        "niveau",
        "club",
        "sessions",
        "hf_moyen",
        "accuracy",
        "derniere_seance",
      ];
      const lines = [header.map(csvField).join(",")];
      for (const sh of shooters) {
        const sess = sessionsByShooter[sh.id] || [];
        const meanScore = avg(sess.map((x) => Number(x.normalized_score) || 0));
        const meanAcc = avg(
          sess.map((x) => (Number(x.accuracy) || 0) * 100)
        );
        const last = sess
          .map((x) => isoDate(x.date))
          .filter(Boolean)
          .sort()
          .pop();
        lines.push(
          [
            csvField(sh.name || ""),
            csvField(deriveLevel(meanScore)),
            csvField(sh.unit || ""),
            csvField(sess.length),
            csvField(meanScore > 0 ? (meanScore / 10).toFixed(2) : ""),
            csvField(meanAcc > 0 ? `${Math.round(meanAcc)}%` : ""),
            csvField(last || ""),
          ].join(",")
        );
      }
      downloadBlob(
        `opmind-tireurs-${todayStamp()}.csv`,
        String.fromCharCode(0xfeff) + lines.join("\r\n"),
        "text/csv;charset=utf-8"
      );
    } catch {
      /* ignore */
    } finally {
      setExporting(null);
    }
  }

  async function handleSignOut() {
    try {
      await getSupabase().auth.signOut();
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }

  /* ──────  Derived  ────── */
  const qrValue = userId
    ? `opmind://link?uid=${userId}&token=${userId.slice(0, 6)}`
    : "opmind://link";
  const linkCode = userId ? userId.slice(0, 6).toUpperCase() : "······";

  return (
    <div
      className={styles.page}
      style={{
        background: BG,
        minHeight: "100vh",
        color: INK,
        fontFamily: FONT_RAJ,
      }}
    >
      <TopHeader onSignOut={handleSignOut} />

      <main style={{ padding: "32px 40px 80px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <TitleSection />

          {/* Section 1 — Notifications */}
          <SectionLabel text="// NOTIFICATIONS — CE QUI TE PARVIENT PAR EMAIL" />
          <div className={styles.panel} style={cardStyle}>
            <NotifRow
              title="Séance complétée."
              desc="Un tireur valide une séance assignée."
              on={notif.session_complete}
              onToggle={() => {
                setNotif((p) => ({ ...p, session_complete: !p.session_complete }));
                setSaved(false);
              }}
            />
            <Divider />
            <NotifRow
              title="Invitation acceptée."
              desc="Un tireur rejoint ta classe."
              on={notif.invitation_accepted}
              onToggle={() => {
                setNotif((p) => ({
                  ...p,
                  invitation_accepted: !p.invitation_accepted,
                }));
                setSaved(false);
              }}
            />
            <Divider />
            <NotifRow
              title="Rapport hebdomadaire."
              desc="Résumé d'activité chaque lundi matin."
              on={notif.weekly_report}
              onToggle={() => {
                setNotif((p) => ({ ...p, weekly_report: !p.weekly_report }));
                setSaved(false);
              }}
            />
            <Divider />
            <NotifRow
              title="Tireur inactif."
              desc="Alerte si aucune séance depuis X jours."
              on={inactiveAlert}
              onToggle={() => {
                setInactiveAlert((v) => !v);
                setSaved(false);
              }}
              trailing={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={inactiveDays}
                    disabled={!inactiveAlert}
                    onChange={(e) => {
                      const v = Math.min(60, Math.max(1, Number(e.target.value) || 1));
                      setInactiveDays(v);
                      setSaved(false);
                    }}
                    style={{
                      width: 64,
                      background: SURFACE,
                      border: `1px solid ${INPUT_BORDER}`,
                      color: inactiveAlert ? INK : INK_FAINT,
                      padding: "8px 10px",
                      fontFamily: FONT_RAJ,
                      fontSize: 14,
                      fontWeight: 700,
                      textAlign: "center",
                      outline: "none",
                      opacity: inactiveAlert ? 1 : 0.4,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: FONT_RAJ,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: INK_DIM,
                    }}
                  >
                    jours
                  </span>
                </div>
              }
            />
          </div>

          {/* Section 2 — Affichage */}
          <SectionLabel text="// AFFICHAGE — PRÉFÉRENCES VISUELLES" />
          <div className={styles.panel} style={cardStyle}>
            <RadioRow
              label="Langue"
              value={display.language}
              options={[
                { value: "fr", label: "FR" },
                { value: "en", label: "EN" },
              ]}
              onChange={(v) => {
                setDisplay((p) => ({ ...p, language: v as "fr" | "en" }));
                setSaved(false);
              }}
            />
            <Divider />
            <RadioRow
              label="Format date"
              value={display.date_format}
              options={[
                { value: "dmy", label: "DD/MM/YY" },
                { value: "mdy", label: "MM/DD/YY" },
              ]}
              onChange={(v) => {
                setDisplay((p) => ({ ...p, date_format: v as "dmy" | "mdy" }));
                setSaved(false);
              }}
            />
            <Divider />
            <RadioRow
              label="Unités de distance"
              value={display.units}
              options={[
                { value: "m", label: "Mètres" },
                { value: "yd", label: "Yards" },
              ]}
              onChange={(v) => {
                setDisplay((p) => ({ ...p, units: v as "m" | "yd" }));
                setSaved(false);
              }}
            />
            <Divider />
            <RadioRow
              label="Vue par défaut Mes Tireurs"
              value={display.shooters_view}
              options={[
                { value: "grid", label: "Grille" },
                { value: "list", label: "Liste" },
              ]}
              onChange={(v) => {
                setDisplay((p) => ({ ...p, shooters_view: v as "grid" | "list" }));
                setSaved(false);
              }}
            />
          </div>

          {/* Section 3 — App mobile */}
          <SectionLabel text="// APP MOBILE — SYNCHRONISATION" />
          <div
            className={styles.panel}
            style={{
              padding: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: FONT_RAJ,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  color: INK,
                }}
              >
                Lier l&apos;application OpMind
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: FONT_RAJ,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: INK_DIM,
                }}
              >
                Scanne ce code depuis l&apos;app pour synchroniser ton compte.
              </div>
            </div>

            <div style={{ background: "#fff", padding: 12, lineHeight: 0 }}>
              <QRCodeSVG
                value={qrValue}
                size={168}
                bgColor="#ffffff"
                fgColor="#0a0a0a"
                level="M"
              />
            </div>

            <div
              style={{
                fontFamily: FONT_RAJ,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: INK,
              }}
            >
              Code · <span style={{ color: ACCENT_BRIGHT }}>{linkCode}</span>
            </div>

            <div
              style={{
                marginTop: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: FONT_RAJ,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: linkedDevice ? OK : INK_DIM,
              }}
            >
              {linkedDevice ? (
                <>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: OK,
                    }}
                  />
                  Lié · {linkedDevice.name || "Appareil"}
                  {linkedDevice.last_sync
                    ? ` · Dernière synchro ${isoDate(linkedDevice.last_sync)}`
                    : ""}
                </>
              ) : (
                <>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      border: `1px solid ${INK_DIM}`,
                    }}
                  />
                  Aucun appareil lié
                </>
              )}
            </div>
          </div>

          {/* Section 4 — Données */}
          <SectionLabel text="// DONNÉES — EXPORT & CONFIDENTIALITÉ" />
          <div className={styles.panel} style={cardStyle}>
            <button
              type="button"
              onClick={handleExportJson}
              disabled={exporting !== null}
              style={outlineButtonStyle(exporting === "json")}
            >
              {exporting === "json" ? "Export en cours..." : "Exporter mes données"}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting !== null}
              style={outlineButtonStyle(exporting === "csv")}
            >
              {exporting === "csv" ? "Export en cours..." : "Exporter tireurs CSV"}
            </button>
          </div>

          {/* Save */}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                flex: 1,
                background: ACCENT,
                border: "none",
                color: "#fff",
                padding: "14px 16px",
                fontFamily: FONT_RAJ,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: saving || loading ? "default" : "pointer",
                opacity: saving || loading ? 0.6 : 1,
              }}
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
            {saved && (
              <span
                style={{
                  fontFamily: FONT_RAJ,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: OK,
                }}
              >
                Modifications enregistrées localement et synchronisées
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ──────────────  Top header  ────────────── */

function TopHeader({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        height: 56,
        background: SURFACE_DARK,
        borderBottom: `1px solid ${LINE}`,
        display: "grid",
        gridTemplateColumns: "1fr 360px auto",
        alignItems: "center",
        gap: 16,
        padding: "0 24px",
        zIndex: 30,
      }}
    >
      <div
        style={{
          fontFamily: FONT_RAJ,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: INK_DIM,
        }}
      >
        <span style={{ color: INK_FAINT }}>Dashboard</span>
        <span style={{ margin: "0 8px", color: INK_FAINT }}>/</span>
        <span style={{ color: INK_FAINT }}>Compte</span>
        <span style={{ margin: "0 8px", color: INK_FAINT }}>/</span>
        <span style={{ color: INK }}>Paramètres</span>
      </div>
      <input
        type="text"
        placeholder="Rechercher séance, drill, tireur..."
        style={{
          background: BG,
          border: `1px solid ${LINE}`,
          color: INK,
          padding: "8px 12px",
          fontFamily: FONT_RAJ,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onSignOut}
          style={{
            background: "transparent",
            border: `1px solid ${LINE}`,
            color: INK,
            padding: "8px 14px",
            fontFamily: FONT_RAJ,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Déconnexion
        </button>
        <Link
          href="/dashboard?view=create_session"
          style={{
            background: ACCENT,
            border: "none",
            color: "#fff",
            padding: "8px 14px",
            fontFamily: FONT_RAJ,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            cursor: "pointer",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          + Créer une séance
        </Link>
      </div>
    </header>
  );
}

/* ──────────────  Title section  ────────────── */

function TitleSection() {
  return (
    <div className={styles["page-head"]}>
      <div>
        <div className={styles.eyebrow}>Module · Configuration</div>
        <h1 className={styles.title}>
          Mes <em>Paramètres.</em>
        </h1>
        <div className={styles["title-sub"]}>
          Notifications, affichage et synchronisation.
        </div>
      </div>
    </div>
  );
}

/* ──────────────  Rows  ────────────── */

function NotifRow({
  title,
  desc,
  on,
  onToggle,
  trailing,
}: {
  title: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={rowTitleStyle}>{title}</div>
        <div style={rowDescStyle}>{desc}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        {trailing}
        <Toggle on={on} onClick={onToggle} />
      </div>
    </div>
  );
}

function RadioRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={rowTitleStyle}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              style={{
                background: active ? "var(--red-soft)" : SURFACE,
                border: `1px solid ${active ? ACCENT : INPUT_BORDER}`,
                color: active ? INK : INK_DIM,
                padding: "8px 18px",
                fontFamily: FONT_RAJ,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
                minWidth: 72,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      style={{
        width: 52,
        height: 28,
        background: on ? ACCENT : "#333",
        border: `1px solid ${on ? ACCENT : "#444"}`,
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background .15s",
        borderRadius: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 26 : 2,
          width: 22,
          height: 22,
          background: "#fff",
          transition: "left .15s",
        }}
      />
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: LINE }} />;
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        margin: "36px 0 12px",
        fontFamily: "var(--mono)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: INK_DIM,
      }}
    >
      {text}
    </div>
  );
}

/* ──────────────  Styles  ────────────── */

const cardStyle: React.CSSProperties = {
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const rowTitleStyle: React.CSSProperties = {
  fontFamily: FONT_RAJ,
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "0.02em",
  color: INK,
};

const rowDescStyle: React.CSSProperties = {
  marginTop: 4,
  fontFamily: FONT_RAJ,
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: "0.02em",
  color: INK_DIM,
  maxWidth: 360,
  lineHeight: 1.4,
};

function outlineButtonStyle(busy: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${INPUT_BORDER}`,
    color: INK,
    padding: "14px 16px",
    fontFamily: FONT_RAJ,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    cursor: busy ? "default" : "pointer",
    width: "100%",
    opacity: busy ? 0.6 : 1,
  };
}
