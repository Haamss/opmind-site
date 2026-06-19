"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { isInstructorRole } from "@/lib/roles";
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
const INPUT_BG = "var(--surface)";
const INPUT_BORDER = "var(--line-2)";
const SYNC_BG = "rgba(90, 217, 155, 0.1)";

const FONT_RAJ = "var(--sans)";

const CITY_POOL = [
  "Marseille",
  "Lyon",
  "Paris",
  "Bordeaux",
  "Lille",
  "Toulouse",
  "Nantes",
  "Strasbourg",
];

/* ──────────────  Types  ────────────── */

type RoleValue = "INSTRUCTEUR" | "TIREUR" | "ADMIN";

type Chargeur = {
  id: string;
  modele: string;
  sous_modele: string;
  calibre: string;
  mention: string;
  capacite: number;
  usage: "match" | "entrainement";
};

type ProfileRow = {
  id: string;
  pseudo?: string | null;
  profile_type?: string | null;
  role?: string | null;
  is_admin?: boolean | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  club?: string | null;
  profile_data?: Record<string, unknown> | null;
  created_at?: string | null;
  mfa_enabled?: boolean | null;
};

/* ──────────────  Helpers  ────────────── */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickFrom<T>(arr: T[], seed: string): T {
  return arr[hash(seed) % arr.length];
}

function formatDDMMYY(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

function formatDDMM(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

function countSince(dates: (string | null | undefined)[], days: number): number {
  const cutoff = Date.now() - days * 86400000;
  return dates.filter((d) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    return !isNaN(t) && t >= cutoff;
  }).length;
}

function defaultChargeurs(): Chargeur[] {
  return [
    {
      id: "demo-pmag",
      modele: "Magpul PMAG",
      sous_modele: "BLOCK 17 · GEN5",
      calibre: "9×19",
      mention: "Parabellum",
      capacite: 17,
      usage: "match",
    },
    {
      id: "demo-ets",
      modele: "ETS Coyote",
      sous_modele: "BLOCK 17 · TRANSLUCIDE",
      calibre: "9×19",
      mention: "Parabellum",
      capacite: 20,
      usage: "entrainement",
    },
  ];
}

function normalizeChargeurs(raw: unknown): Chargeur[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultChargeurs();
  return raw.map((c, i) => {
    const o = (c || {}) as Record<string, unknown>;
    return {
      id: typeof o.id === "string" ? o.id : `c-${i}`,
      modele: typeof o.modele === "string" ? o.modele : "",
      sous_modele: typeof o.sous_modele === "string" ? o.sous_modele : "",
      calibre: typeof o.calibre === "string" ? o.calibre : "",
      mention: typeof o.mention === "string" ? o.mention : "",
      capacite: Number(o.capacite) || 0,
      usage: o.usage === "entrainement" ? "entrainement" : "match",
    };
  });
}

/* ──────────────  Page  ────────────── */

export default function ProfilPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleValue>("TIREUR");
  // Rôle dérivé au chargement : pour ne réécrire la colonne role que si
  // l'utilisateur change explicitement le sélecteur (sinon on préserverait
  // par écrasement une des 5 nouvelles valeurs de profil).
  const [initialRole, setInitialRole] = useState<RoleValue>("TIREUR");
  const [club, setClub] = useState("");
  const [bio, setBio] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [chargeurs, setChargeurs] = useState<Chargeur[]>(defaultChargeurs());
  const [profileData, setProfileData] = useState<Record<string, unknown>>({});

  const [activeShooters, setActiveShooters] = useState(0);
  const [sessionDates, setSessionDates] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwSent, setPwSent] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        const uid = session.user.id;
        const mail = session.user.email ?? "";
        setUserId(uid);
        setAuthEmail(mail);
        setLastSignIn(session.user.last_sign_in_at ?? null);

        const { data: prof } = await sb
          .from("profiles")
          .select(
            "id,pseudo,profile_type,role,is_admin,first_name,last_name,email,club,profile_data,created_at,mfa_enabled"
          )
          .eq("id", uid)
          .maybeSingle();
        if (cancelled) return;

        const p = (prof as ProfileRow | null) || { id: uid };
        const pd = (p.profile_data as Record<string, unknown> | null) || {};
        setProfileData(pd);

        let fn = (p.first_name || "").trim();
        let ln = (p.last_name || "").trim();
        if (!ln) {
          const pseudo = (p.pseudo || "").trim();
          const sp = pseudo.indexOf(" ");
          if (sp > -1) {
            if (!fn) fn = pseudo.slice(0, sp).trim();
            ln = pseudo.slice(sp + 1).trim();
          } else if (!fn) {
            fn = pseudo;
          }
        }
        setFirstName(fn);
        setLastName(ln);
        setEmail(p.email || mail);
        setClub(p.club || "");
        setBio(typeof pd.bio === "string" ? pd.bio : "");
        setMfaEnabled(Boolean(p.mfa_enabled));
        setChargeurs(normalizeChargeurs(pd.chargeurs));
        setCreatedAt(p.created_at ?? null);
        const derivedRole: RoleValue = p.is_admin
          ? "ADMIN"
          : isInstructorRole(p.role)
            ? "INSTRUCTEUR"
            : "TIREUR";
        setRole(derivedRole);
        setInitialRole(derivedRole);

        const { count: shootersCount } = await sb
          .from("instructor_shooters")
          .select("id", { count: "exact", head: true })
          .eq("instructor_id", uid)
          .eq("status", "active");
        if (cancelled) return;
        setActiveShooters(shootersCount || 0);

        const { data: shooterRows } = await sb
          .from("instructor_shooters")
          .select("id")
          .eq("instructor_id", uid);
        const ids = ((shooterRows as { id: string }[] | null) || []).map(
          (r) => r.id
        );
        if (ids.length > 0) {
          const { data: sess } = await sb
            .from("manual_sessions")
            .select("date")
            .in("instructor_shooter_id", ids);
          if (!cancelled && Array.isArray(sess)) {
            setSessionDates(
              (sess as { date: string | null }[]).map((s) => s.date || "")
            );
          }
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

  /* ──────  Derived  ────── */
  const operatorId = useMemo(
    () => (userId ? `OPM-${userId.slice(0, 4).toUpperCase()}-HB` : "OPM-····-HB"),
    [userId]
  );
  const fullName = `${firstName} ${lastName}`.trim().toUpperCase() || "OPÉRATEUR";
  const avatarInitial = (firstName.charAt(0) || "H").toUpperCase();
  const city = userId ? pickFrom(CITY_POOL, userId + "city") : "—";
  const fftir = userId
    ? String((hash(userId + "fftir") % 900000) + 100000)
    : "——————";
  const roleBadge =
    role === "ADMIN"
      ? "ADMIN · PRO"
      : role === "INSTRUCTEUR"
        ? "INSTRUCTEUR · PRO"
        : "TIREUR";

  const sessionsCreated = sessionDates.length;
  const sessionsTrim = countSince(sessionDates, 90);
  const hoursCoaching = Math.round(((sessionsCreated * 45) / 60) * 10) / 10;
  const hoursThisMonth =
    Math.round(((countSince(sessionDates, 30) * 45) / 60) * 10) / 10;

  /* ──────  Persistence  ────── */
  async function persistPatch(patch: Record<string, unknown>) {
    if (!userId) return;
    const sb = getSupabase();
    await sb.from("profiles").update(patch).eq("id", userId);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    try {
      const sb = getSupabase();
      const fn = firstName.trim();
      const ln = lastName.trim();
      const pseudo = [fn, ln].filter(Boolean).join(" ") || fn || ln;
      const nextProfileData = { ...profileData, bio: bio.trim(), chargeurs };

      const upsertRow: Record<string, unknown> = {
        id: userId,
        first_name: fn,
        last_name: ln,
        pseudo,
        club: club.trim() || null,
        mfa_enabled: mfaEnabled,
        profile_data: nextProfileData,
      };

      // On ne touche au rôle que si l'utilisateur a explicitement changé le
      // sélecteur (TIREUR/INSTRUCTEUR/ADMIN). Sinon on laisse la valeur DB
      // intacte (préserve militaire/police/ipsc/instructeur/autre).
      if (role !== initialRole) {
        // TIREUR -> "shooter" (fonction tireur) ; INSTRUCTEUR/ADMIN ->
        // "instructeur" (fonction instructeur), is_admin distingue l'admin.
        upsertRow.role = role === "TIREUR" ? "shooter" : "instructeur";
        upsertRow.is_admin = role === "ADMIN";
      }

      const { error } = await sb
        .from("profiles")
        .upsert(upsertRow, { onConflict: "id" });
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

  async function toggleMfa() {
    const next = !mfaEnabled;
    setMfaEnabled(next);
    setSaved(false);
    await persistPatch({ mfa_enabled: next });
  }

  async function handlePasswordReset() {
    if (!email) return;
    try {
      const sb = getSupabase();
      await sb.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/login`
            : undefined,
      });
      setPwSent(true);
    } catch {
      /* ignore */
    }
  }

  async function handleSignOut(scope: "local" | "global") {
    try {
      const sb = getSupabase();
      await sb.auth.signOut(scope === "global" ? { scope: "global" } : undefined);
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const sb = getSupabase();
      const { error } = await sb.functions.invoke("delete-account");
      if (error) {
        setDeleting(false);
        return;
      }
      await sb.auth.signOut({ scope: "global" });
      router.replace("/login");
    } catch {
      setDeleting(false);
    }
  }

  /* ──────  Chargeurs editing  ────── */
  function updateChargeur(id: string, patch: Partial<Chargeur>) {
    setChargeurs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
    setSaved(false);
  }
  function removeChargeur(id: string) {
    setChargeurs((prev) => prev.filter((c) => c.id !== id));
    setSaved(false);
  }
  function addChargeur() {
    setChargeurs((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        modele: "Nouveau chargeur",
        sous_modele: "",
        calibre: "9mm",
        mention: "",
        capacite: 15,
        usage: "entrainement",
      },
    ]);
    setSaved(false);
  }

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
      <TopHeader onSignOut={() => handleSignOut("local")} />

      <main
        style={{
          padding: "32px 40px 80px",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 320px",
          gap: 32,
        }}
      >
        {/* Left column */}
        <div style={{ minWidth: 0, maxWidth: 760 }}>
          <TitleSection synced={!loading} operatorId={operatorId} />

          {/* Section: profil */}
          <SectionLabel text="// MON PROFIL — VISIBLE PAR TES TIREURS" />
          <div
            className={styles.panel}
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Prénom">
                <TextInput value={firstName} onChange={setFirstName} placeholder="Prénom" />
              </Field>
              <Field label="Nom">
                <TextInput value={lastName} onChange={setLastName} placeholder="Nom" />
              </Field>
            </div>

            <Field label="Email" note="Adresse vérifiée · contacte le support pour le modifier">
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  value={email}
                  disabled
                  style={{
                    ...inputStyle,
                    width: "100%",
                    color: INK_DIM,
                    paddingRight: 40,
                    cursor: "not-allowed",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: INK_DIM,
                    display: "inline-flex",
                  }}
                  aria-hidden
                >
                  <IconLock />
                </span>
              </div>
            </Field>

            <Field label="Rôle">
              <div style={{ position: "relative" }}>
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as RoleValue);
                    setSaved(false);
                  }}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    appearance: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="INSTRUCTEUR">INSTRUCTEUR</option>
                  <option value="TIREUR">TIREUR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: INK_DIM,
                    pointerEvents: "none",
                    fontSize: 11,
                  }}
                  aria-hidden
                >
                  ▾
                </span>
              </div>
            </Field>

            <Field label="Club (optionnel)">
              <TextInput value={club} onChange={setClub} placeholder="Nom du club" />
            </Field>

            <Field
              label="Bio courte (optionnel)"
              note="Affichée sur ta fiche coach · 80 caractères max"
            >
              <textarea
                value={bio}
                maxLength={80}
                onChange={(e) => {
                  setBio(e.target.value);
                  setSaved(false);
                }}
                rows={1}
                placeholder="Une ligne sur ton approche du coaching"
                style={{
                  ...inputStyle,
                  width: "100%",
                  resize: "none",
                  lineHeight: 1.4,
                }}
              />
            </Field>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
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
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.6 : 1,
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

          {/* Section: sécurité */}
          <SectionLabel text="// SÉCURITÉ — ACCÈS & AUTHENTIFICATION" />
          <div
            className={styles.panel}
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
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
                <div style={rowTitleStyle}>Mot de passe.</div>
                <div style={rowDescStyle}>
                  Modifie ton mot de passe via un lien sécurisé envoyé par email.
                </div>
                {pwSent && (
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: FONT_RAJ,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: OK,
                    }}
                  >
                    Lien envoyé à {email}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handlePasswordReset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  border: `1px solid ${INPUT_BORDER}`,
                  color: INK,
                  padding: "10px 16px",
                  fontFamily: FONT_RAJ,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <IconLock /> Changer mon mot de passe
              </button>
            </div>

            <div style={{ height: 1, background: LINE }} />

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
                <div style={rowTitleStyle}>Double authentification.</div>
                <div style={rowDescStyle}>
                  Ajoute une couche de sécurité supplémentaire à la connexion.
                </div>
              </div>
              <Toggle on={mfaEnabled} onClick={toggleMfa} />
            </div>
          </div>

          {/* Section: chargeurs */}
          <SectionLabel text="// MES CHARGEURS — CONFIG MATÉRIEL · PRÉ-REMPLI AUX SÉANCES" />
          <div
            className={styles.panel}
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 1fr 90px 130px 32px",
                gap: 12,
                paddingBottom: 8,
                borderBottom: `1px solid ${LINE}`,
                fontFamily: FONT_RAJ,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: INK_FAINT,
              }}
            >
              <span>#</span>
              <span>Modèle</span>
              <span>Calibre</span>
              <span>Capacité</span>
              <span>Usage</span>
              <span />
            </div>

            {chargeurs.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 1fr 90px 130px 32px",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: 18,
                    fontWeight: 500,
                    color: ACCENT_BRIGHT,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <CellInput
                    value={c.modele}
                    onChange={(v) => updateChargeur(c.id, { modele: v })}
                    bold
                    placeholder="Modèle"
                  />
                  <CellInput
                    value={c.sous_modele}
                    onChange={(v) => updateChargeur(c.id, { sous_modele: v })}
                    dim
                    placeholder="Sous-modèle"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <CellInput
                    value={c.calibre}
                    onChange={(v) => updateChargeur(c.id, { calibre: v })}
                    bold
                    placeholder="Calibre"
                  />
                  <CellInput
                    value={c.mention}
                    onChange={(v) => updateChargeur(c.id, { mention: v })}
                    dim
                    placeholder="Mention"
                  />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <input
                    type="number"
                    value={c.capacite}
                    onChange={(e) =>
                      updateChargeur(c.id, {
                        capacite: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    style={{
                      width: 44,
                      background: "transparent",
                      border: "none",
                      borderBottom: `1px solid ${INPUT_BORDER}`,
                      color: INK,
                      fontFamily: FONT_RAJ,
                      fontSize: 16,
                      fontWeight: 700,
                      outline: "none",
                      padding: "2px 0",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: FONT_RAJ,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: INK_DIM,
                    }}
                  >
                    rds
                  </span>
                </div>
                <UsageBadge
                  usage={c.usage}
                  onToggle={() =>
                    updateChargeur(c.id, {
                      usage: c.usage === "match" ? "entrainement" : "match",
                    })
                  }
                />
                <button
                  type="button"
                  aria-label="Supprimer le chargeur"
                  onClick={() => removeChargeur(c.id)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${INPUT_BORDER}`,
                    color: INK_DIM,
                    width: 28,
                    height: 28,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontFamily: FONT_RAJ,
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addChargeur}
              style={{
                background: "transparent",
                border: `1px dashed var(--line-2)`,
                color: INK_DIM,
                padding: "12px 16px",
                fontFamily: FONT_RAJ,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: "pointer",
                width: "100%",
              }}
            >
              + Ajouter un chargeur
            </button>
          </div>
        </div>

        {/* Right column */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "sticky",
            top: 80,
            alignSelf: "start",
          }}
        >
          <IdentityCard
            avatarInitial={avatarInitial}
            fullName={fullName}
            roleBadge={roleBadge}
            club={club}
            fftir={fftir}
            activeShooters={activeShooters}
            createdAt={createdAt}
            lastSignIn={lastSignIn}
            city={city}
            sessionsCreated={sessionsCreated}
            sessionsTrim={sessionsTrim}
            hoursCoaching={hoursCoaching}
            hoursThisMonth={hoursThisMonth}
          />

          <DangerZone
            onSignOutEverywhere={() => handleSignOut("global")}
            onDeleteRequest={() => setDeleteOpen(true)}
          />
        </aside>
      </main>

      {deleteOpen && (
        <DeleteModal
          deleting={deleting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
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
        <span style={{ color: INK }}>Mon Profil</span>
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

function TitleSection({
  synced,
  operatorId,
}: {
  synced: boolean;
  operatorId: string;
}) {
  return (
    <div className={styles["page-head"]}>
      <div>
        <div className={styles.eyebrow}>Module · Profil</div>
        <h1 className={styles.title}>
          Mon <em>Profil.</em>
        </h1>
        <div className={styles["title-sub"]}>
          Identité opérateur, sécurité et configuration matériel.
        </div>
      </div>
      <div className={styles["head-meta"]}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: SYNC_BG,
            color: OK,
            padding: "5px 10px",
            fontFamily: "var(--mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{ width: 7, height: 7, borderRadius: "50%", background: OK }}
          />
          {synced ? "Synchronisé" : "Connexion..."}
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: INK_DIM,
          }}
        >
          ID Opérateur :{" "}
          <span style={{ color: INK }}>{operatorId}</span>
        </span>
      </div>
    </div>
  );
}

/* ──────────────  Identity card  ────────────── */

function IdentityCard({
  avatarInitial,
  fullName,
  roleBadge,
  club,
  fftir,
  activeShooters,
  createdAt,
  lastSignIn,
  city,
  sessionsCreated,
  sessionsTrim,
  hoursCoaching,
  hoursThisMonth,
}: {
  avatarInitial: string;
  fullName: string;
  roleBadge: string;
  club: string;
  fftir: string;
  activeShooters: number;
  createdAt: string | null;
  lastSignIn: string | null;
  city: string;
  sessionsCreated: number;
  sessionsTrim: number;
  hoursCoaching: number;
  hoursThisMonth: number;
}) {
  const stats: { label: string; value: string; sub: string; subColor: string }[] =
    [
      {
        label: "Membre depuis",
        value: formatDDMMYY(createdAt),
        sub: "Compte vérifié",
        subColor: INK_DIM,
      },
      {
        label: "Dernière connexion",
        value: formatDDMM(lastSignIn),
        sub: city,
        subColor: INK_DIM,
      },
      {
        label: "Séances créées",
        value: String(sessionsCreated),
        sub: `+${sessionsTrim} ce trim.`,
        subColor: OK,
      },
      {
        label: "Heures coaching",
        value: `${hoursCoaching} h`,
        sub: `${hoursThisMonth} h ce mois`,
        subColor: OK,
      },
    ];
  return (
    <section className={styles.panel} style={{ padding: 20 }}>
      {/* Avatar */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "var(--red-deep)",
              border: "1px solid var(--red)",
              color: INK,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--display)",
              fontSize: 40,
              fontWeight: 600,
            }}
          >
            {avatarInitial}
          </div>
          <button
            type="button"
            aria-label="Modifier la photo"
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 28,
              height: 28,
              background: SURFACE_DARK,
              border: `1px solid ${INPUT_BORDER}`,
              color: INK,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <IconPencil />
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div
          style={{
            fontFamily: "var(--display)",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            color: INK,
            lineHeight: 1.1,
          }}
        >
          {fullName}
        </div>
        <div style={{ marginTop: 8 }}>
          <span
            style={{
              fontFamily: FONT_RAJ,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#fff",
              background: ACCENT,
              padding: "3px 8px",
            }}
          >
            {roleBadge}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <InfoLine
          label={club ? club.toUpperCase() : "Club indépendant"}
          value={`FFTIR ${fftir}`}
        />
        <InfoLine
          label="Statut"
          value={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: OK }}>
              <span
                style={{ width: 7, height: 7, borderRadius: "50%", background: OK }}
              />
              Actif
            </span>
          }
        />
        <InfoLine label="Tireurs encadrés" value={String(activeShooters).padStart(2, "0")} />
        <InfoLine label="Plan" value="PRO · Annuel" valueColor={ACCENT_BRIGHT} />
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          background: LINE,
          border: `1px solid ${LINE}`,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: SURFACE,
              padding: "14px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span
              style={{
                fontFamily: FONT_RAJ,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: INK_FAINT,
              }}
            >
              {s.label}
            </span>
            <span
              style={{
                fontFamily: "var(--display)",
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: INK,
                lineHeight: 1,
              }}
            >
              {s.value}
            </span>
            <span
              style={{
                fontFamily: FONT_RAJ,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: s.subColor,
              }}
            >
              {s.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function InfoLine({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        fontFamily: FONT_RAJ,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          color: INK_DIM,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span style={{ color: valueColor || INK, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

/* ──────────────  Danger zone  ────────────── */

function DangerZone({
  onSignOutEverywhere,
  onDeleteRequest,
}: {
  onSignOutEverywhere: () => void;
  onDeleteRequest: () => void;
}) {
  return (
    <section
      style={{
        background: SURFACE,
        border: `1px solid ${ACCENT}`,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: FONT_RAJ,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: ACCENT_BRIGHT,
        }}
      >
        // Zone critique
        <span
          style={{
            fontSize: 9,
            color: ACCENT_BRIGHT,
            border: `1px solid ${ACCENT}`,
            padding: "1px 6px",
          }}
        >
          Irréversible
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={rowTitleStyle}>Se déconnecter partout</div>
        <div style={rowDescStyle}>
          Ferme toutes les sessions actives sur l&apos;ensemble de tes appareils.
        </div>
        <button
          type="button"
          onClick={onSignOutEverywhere}
          style={{
            marginTop: 4,
            background: "transparent",
            border: `1px solid ${ACCENT}`,
            color: ACCENT_BRIGHT,
            padding: "10px 14px",
            fontFamily: FONT_RAJ,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Déconnecter tout
        </button>
      </div>

      <div style={{ height: 1, background: LINE }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={rowTitleStyle}>Supprimer mon compte</div>
        <div style={rowDescStyle}>
          Efface définitivement ton compte et toutes tes données. Action
          irréversible.
        </div>
        <button
          type="button"
          onClick={onDeleteRequest}
          style={{
            marginTop: 4,
            background: ACCENT,
            border: "none",
            color: "#fff",
            padding: "10px 14px",
            fontFamily: FONT_RAJ,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Supprimer
        </button>
      </div>
    </section>
  );
}

/* ──────────────  Delete modal  ────────────── */

function DeleteModal({
  deleting,
  onCancel,
  onConfirm,
}: {
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 24,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: SURFACE,
          border: `1px solid ${ACCENT}`,
          padding: 28,
          maxWidth: 420,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: FONT_RAJ,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: ACCENT_BRIGHT,
          }}
        >
          // Confirmation requise
        </div>
        <div
          style={{
            fontFamily: "var(--display)",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            color: INK,
            lineHeight: 1.1,
          }}
        >
          Supprimer ton compte ?
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: FONT_RAJ,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.02em",
            color: INK_DIM,
            lineHeight: 1.5,
          }}
        >
          Cette action est définitive. Toutes tes séances, tireurs et données de
          profil seront supprimés et ne pourront pas être récupérés.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1,
              background: "transparent",
              border: `1px solid ${INPUT_BORDER}`,
              color: INK,
              padding: "12px 14px",
              fontFamily: FONT_RAJ,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: deleting ? "default" : "pointer",
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1,
              background: ACCENT,
              border: "none",
              color: "#fff",
              padding: "12px 14px",
              fontFamily: FONT_RAJ,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: deleting ? "default" : "pointer",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? "Suppression..." : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────  Small UI primitives  ────────────── */

const inputStyle: React.CSSProperties = {
  background: INPUT_BG,
  border: `1px solid ${INPUT_BORDER}`,
  color: INK,
  padding: "12px 16px",
  fontFamily: FONT_RAJ,
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "0.02em",
  outline: "none",
  borderRadius: 0,
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

function Field({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontFamily: FONT_RAJ,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: INK_DIM,
        }}
      >
        {label}
      </label>
      {children}
      {note && (
        <span
          style={{
            fontFamily: FONT_RAJ,
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.06em",
            color: INK_FAINT,
          }}
        >
          {note}
        </span>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        width: "100%",
        borderColor: focused ? ACCENT : INPUT_BORDER,
      }}
    />
  );
}

function CellInput({
  value,
  onChange,
  bold,
  dim,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  bold?: boolean;
  dim?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "transparent",
        border: "none",
        color: dim ? INK_DIM : INK,
        fontFamily: FONT_RAJ,
        fontSize: dim ? 11 : 14,
        fontWeight: bold ? 700 : 500,
        letterSpacing: "0.02em",
        outline: "none",
        padding: "2px 0",
        width: "100%",
        minWidth: 0,
      }}
    />
  );
}

function UsageBadge({
  usage,
  onToggle,
}: {
  usage: "match" | "entrainement";
  onToggle: () => void;
}) {
  const isMatch = usage === "match";
  return (
    <button
      type="button"
      onClick={onToggle}
      title="Basculer match / entraînement"
      style={{
        background: isMatch ? "var(--red-soft)" : SURFACE,
        border: `1px solid ${isMatch ? ACCENT : INPUT_BORDER}`,
        color: isMatch ? ACCENT_BRIGHT : INK_DIM,
        padding: "5px 8px",
        fontFamily: FONT_RAJ,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        width: "100%",
      }}
    >
      {isMatch ? "Match" : "Entraînement"}
    </button>
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

/* ──────────────  Icons  ────────────── */

function IconLock() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
