"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./motion.module.css";

/* ──────────────  Helpers  ────────────── */

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** true une fois monte côté client ET si l'utilisateur accepte les animations. */
function useMotionAllowed() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllowed(!prefersReducedMotion());
  }, []);
  return allowed;
}

/** Progression 0 → 1 d'une section épinglée (sticky) pendant qu'on la traverse. */
function usePinProgress(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const v = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      setP(v);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, active]);
  return p;
}

/** Devient true la première fois que l'élément entre dans l'écran. */
function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/* ──────────────  Racine : active le mode animé + révélations  ────────────── */

export function MotionRoot() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    const watch = (scope: ParentNode) => {
      scope.querySelectorAll("[data-reveal]:not([data-in])").forEach((el) => io.observe(el));
    };
    watch(document);
    // Les sections animées se montent après coup : on observe aussi les éléments ajoutés plus tard.
    const mo = new MutationObserver((records) => {
      records.forEach((r) =>
        r.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement) {
            if (n.matches("[data-reveal]:not([data-in])")) io.observe(n);
            watch(n);
          }
        }),
      );
    });
    mo.observe(document.body, { childList: true, subtree: true });
    root.setAttribute("data-motion", "on");
    return () => {
      io.disconnect();
      mo.disconnect();
      root.removeAttribute("data-motion");
    };
  }, []);
  return null;
}

/* ──────────────  Titre d'ouverture  ────────────── */

export function HeroLines({ lines }: { lines: ReactNode[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span
          key={i}
          className={styles.heroLine}
          style={{ "--line-delay": `${80 + i * 110}ms` } as CSSProperties}
        >
          <span>{line}</span>
        </span>
      ))}
    </>
  );
}

/* ──────────────  Chrono de l'en-tête : le défilement devient un run  ────────────── */

const STAGE_SECONDS = 28.4;

export function ShotTimer() {
  const [t, setT] = useState(0);
  const [phase, setPhase] = useState("Standby");

  useEffect(() => {
    let raf = 0;
    const phases: [string, string][] = [
      ["constat", "Live"],
      ["methode", "Live"],
      ["pour-qui", "Brief"],
      ["createur", "Design"],
      ["acces", "Ready"],
    ];
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      setT(p * STAGE_SECONDS);
      let st = p > 0.02 ? "Live" : "Standby";
      phases.forEach(([id, label]) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.5) st = label;
      });
      if (p > 0.985) st = "Stage complete";
      setPhase(st);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const live = t > STAGE_SECONDS * 0.02;
  return (
    <div className={`${styles.timer} ${styles.mono} ${live ? styles.live : ""}`} aria-hidden>
      <span className={styles.timerState}>{phase}</span>
      <span className={styles.chip}>
        <i />
        <span>{live ? `${t.toFixed(3)}S` : "0.000S"}</span>
      </span>
    </div>
  );
}

/* ──────────────  01 Constat : « Pas de » fixe, le mot change  ────────────── */

type ConstatItem = { word: string; body: string };

export function ConstatCycle({
  items,
  header,
  fallback,
}: {
  items: ConstatItem[];
  header: ReactNode;
  fallback: ReactNode;
}) {
  const allowed = useMotionAllowed();
  const track = useRef<HTMLDivElement | null>(null);
  const p = usePinProgress(track, allowed);

  if (!allowed) return <>{fallback}</>;

  const n = items.length;
  const seg = 0.85 / n;
  const idx = Math.min(n - 1, Math.floor(p / seg));
  const struck = p > 0.88;

  return (
    <div ref={track} className={styles.pinTrack} style={{ height: `${n * 100}vh` }}>
      <div className={styles.pin}>
        <div style={{ width: "100%" }}>
          {header}
          <div className={`${styles.slotLabel} ${styles.mono}`}>Pas de</div>
          <div className={styles.slot}>
            {items.map((it, i) => (
              <div
                key={it.word}
                className={`${styles.slotWord} ${styles.display}`}
                data-state={i === idx ? "in" : i < idx ? "out" : "next"}
                data-struck={struck && i === n - 1 ? "true" : "false"}
              >
                {it.word}
              </div>
            ))}
            <StrikeBar active={struck} />
          </div>
          <div className={styles.descs}>
            {items.map((it, i) => (
              <p key={it.word} data-active={i === idx ? "true" : "false"}>
                {it.body}
              </p>
            ))}
          </div>
          <div className={styles.ticks} aria-hidden>
            {items.map((it, i) => {
              const fill = Math.min(1, Math.max(0, (p - i * seg) / seg));
              return (
                <span key={it.word}>
                  <i style={{ transform: `scaleX(${fill})` }} />
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StrikeBar({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setW(0);
      return;
    }
    const word = ref.current?.parentElement?.querySelector<HTMLElement>('[data-struck="true"]');
    setW(word ? word.offsetWidth * 0.97 : 0);
  }, [active]);
  return <div ref={ref} className={styles.strike} style={{ width: w }} />;
}

/* ──────────────  02 Ligne de carnet : en attente → validée  ────────────── */

export function LedgerRow() {
  const [ref, seen] = useInView<HTMLDivElement>(0.5);
  const allowed = useMotionAllowed();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!allowed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(3);
      return;
    }
    if (!seen) return;
    const t1 = window.setTimeout(() => setStep(1), 700);
    const t2 = window.setTimeout(() => setStep(2), 1500);
    const t3 = window.setTimeout(() => setStep(3), 2100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [allowed, seen]);

  // Avant le montage (rendu serveur) on montre l'état final : la page reste complète sans JS.
  const s = allowed ? step : 3;
  const validated = s >= 2;

  const cells: [string, string][] = [
    ["Date", "14/09/2026"],
    ["Régime", "PIA-207"],
    ["Type de séance", "Entretien"],
    ["Munitions", "50 cartouches"],
  ];

  return (
    <div ref={ref}>
      <div className={styles.ledger} data-reveal>
        <div className={`${styles.ledgerHead} ${styles.mono}`}>
          <span>Carnet de tir · Tireur 07</span>
          <span>Ligne 12 / 12 mois glissants</span>
        </div>
        <div className={styles.ledgerRow}>
          {cells.map(([k, v]) => (
            <div key={k}>
              <div className={`${styles.cellK} ${styles.mono}`}>{k}</div>
              <div className={styles.cellV}>{v}</div>
            </div>
          ))}
          <div>
            <div className={`${styles.cellK} ${styles.mono}`}>Statut</div>
            <div className={`${styles.status} ${styles.mono}`} data-validated={validated ? "true" : "false"}>
              {validated ? "Validée" : "En attente de visa"}
            </div>
          </div>
        </div>
        <div className={`${styles.visa} ${styles.mono}`}>
          <span>Visa instructeur</span>
          <span className={styles.visaLine} data-drawn={s >= 1 ? "true" : "false"} />
          <span className={styles.visaText} data-shown={s >= 3 ? "true" : "false"}>
            Signé · 14/09/2026 18:42:07 UTC
          </span>
        </div>
      </div>
      <p className={`${styles.note} ${styles.mono}`}>
        Exemple de ligne · OpMind enregistre, il ne juge pas
      </p>
    </div>
  );
}

/* ──────────────  03 Pour qui : roue de sélection  ────────────── */

type Profile = { title: string; body: string };

export function PourQuiPicker({
  profiles,
  header,
  fallback,
}: {
  profiles: Profile[];
  header: ReactNode;
  fallback: ReactNode;
}) {
  const allowed = useMotionAllowed();
  const track = useRef<HTMLDivElement | null>(null);
  const picker = useRef<HTMLDivElement | null>(null);
  const p = usePinProgress(track, allowed);
  const [ih, setIh] = useState(120);

  useEffect(() => {
    if (!allowed) return;
    const measure = () => {
      if (picker.current) setIh(Math.round(picker.current.offsetHeight / 3));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [allowed]);

  if (!allowed) return <>{fallback}</>;

  const n = profiles.length;
  // palier par profil, avec une transition courte entre deux paliers
  const raw = Math.min(n - 1, Math.max(0, p * n - 0.2));
  const base = Math.floor(raw);
  const frac = raw - base;
  const eased = frac < 0.65 ? 0 : (frac - 0.65) / 0.35;
  const k = Math.min(n - 1, base + eased * eased * (3 - 2 * eased));

  return (
    <div ref={track} className={styles.pinTrack} style={{ height: `${n * 90}vh` }}>
      <div className={styles.pin}>
        <div style={{ width: "100%" }}>
          {header}
          <div ref={picker} className={styles.picker}>
            <div className={styles.band} style={{ top: ih }} />
            <div className={styles.band} style={{ top: ih * 2 }} />
            <div className={styles.wheel} style={{ transform: `translateY(${ih - k * ih}px)` }}>
              {profiles.map((pr, i) => {
                const d = Math.abs(i - k);
                return (
                  <div
                    key={pr.title}
                    className={styles.item}
                    style={{
                      height: ih,
                      opacity: Math.max(0.16, 1 - d * 0.84),
                      filter: `blur(${Math.min(3, d * 3)}px)`,
                    }}
                  >
                    <span className={`${styles.itemTitle} ${styles.display}`}>{pr.title}</span>
                    <span className={styles.itemBody}>{pr.body}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────  04 Plan de stage qui se dessine  ────────────── */

const ROUTE: [number, number][] = [
  [95, 555],
  [95, 470],
  [283, 470],
  [283, 335],
  [425, 335],
  [425, 300],
];
const TARGETS: [number, number, string][] = [
  [110, 110, "T1"],
  [300, 90, "T2"],
  [500, 100, "T3"],
  [520, 250, "T4"],
];
const SHOT_AT = [0.18, 0.5, 0.84, 1];
const SHOT_FROM: [number, number][] = [
  [95, 470],
  [283, 400],
  [425, 335],
  [425, 300],
];

function routeLength() {
  let L = 0;
  for (let i = 1; i < ROUTE.length; i++) {
    L += Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]);
  }
  return L;
}

function pointOnRoute(t: number): [number, number] {
  const total = routeLength();
  let d = t * total;
  for (let i = 1; i < ROUTE.length; i++) {
    const [x0, y0] = ROUTE[i - 1];
    const [x1, y1] = ROUTE[i];
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (d <= L) return [x0 + ((x1 - x0) * d) / L, y0 + ((y1 - y0) * d) / L];
    d -= L;
  }
  return ROUTE[ROUTE.length - 1];
}

export function StageDraw() {
  const allowed = useMotionAllowed();
  const box = useRef<HTMLDivElement | null>(null);
  const [p, setP] = useState(1);

  useEffect(() => {
    if (!allowed) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = box.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 quand le haut du plan arrive à 85 % de l'écran, 1 quand son bas passe à 40 %
      const start = vh * 0.85;
      const end = vh * 0.4 - r.height;
      setP(Math.min(1, Math.max(0, (start - r.top) / (start - end))));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [allowed]);

  const v = allowed ? p : 1;
  const build = Math.min(1, v / 0.45); // les murs et cibles
  const run = Math.min(1, Math.max(0, (v - 0.45) / 0.55)); // le parcours
  const [rx, ry] = pointOnRoute(run);
  const wall = (len: number, offset: number) => ({
    strokeDasharray: len,
    strokeDashoffset: len * (1 - Math.min(1, Math.max(0, (build - offset) / 0.5))),
  });

  return (
    <div ref={box} className={styles.stage}>
      <div className={`${styles.stageHead} ${styles.mono}`}>
        <span>Stage 04 · Vue de dessus · Échelle 1:100</span>
        <span>Run {(run * 2.78).toFixed(2)}</span>
      </div>
      <svg viewBox="0 0 600 640" role="img" aria-label="Plan de stage vu du dessus, quatre cibles et le parcours du tireur">
        <rect x="10" y="10" width="580" height="620" fill="none" stroke="rgba(235,229,210,0.12)" strokeWidth="2" />
        <g stroke="rgba(235,229,210,0.6)" strokeWidth="4" fill="none" strokeLinecap="square">
          <path d="M150 230 V420" style={wall(190, 0)} />
          <path d="M150 230 H300" style={wall(150, 0.15)} />
          <path d="M360 420 H500 V560" style={wall(280, 0.3)} />
        </g>
        <g stroke="rgba(235,229,210,0.3)" strokeWidth="1.5" fill="none" strokeDasharray="6 5" opacity={Math.min(1, build * 2)}>
          <rect x="60" y="520" width="70" height="70" />
          <rect x="250" y="470" width="66" height="66" />
          <rect x="390" y="300" width="70" height="70" />
        </g>
        {TARGETS.map(([x, y, label], i) => {
          const appear = Math.min(1, Math.max(0, (build - 0.3 - i * 0.12) / 0.3));
          const hit = run >= SHOT_AT[i];
          return (
            <g key={label} transform={`translate(${x} ${y - (1 - appear) * 16})`} opacity={appear}>
              <path d="M-26 -34 H26 L32 -10 V34 H-32 V-10 Z" fill="#17171c" stroke="rgba(235,229,210,0.6)" strokeWidth="1.5" />
              <circle r="9" fill="none" stroke="rgba(235,229,210,0.6)" strokeWidth="1.5" />
              <circle r={hit ? 5 : 0} fill="#b31b1b" style={{ transition: "r 0.15s" }} />
              <text y="56" textAnchor="middle" fill="rgba(235,229,210,0.45)" fontFamily="monospace" fontSize="11">
                {label}
              </text>
            </g>
          );
        })}
        <polyline
          points={ROUTE.map((pt) => pt.join(",")).join(" ")}
          fill="none"
          stroke="#9a0000"
          strokeWidth="2"
          strokeDasharray="4 6"
          opacity={build >= 1 ? 0.9 : 0}
        />
        {TARGETS.map(([x, y, label], i) => (
          <line
            key={`s-${label}`}
            x1={SHOT_FROM[i][0]}
            y1={SHOT_FROM[i][1]}
            x2={x}
            y2={y}
            stroke="#9a0000"
            strokeWidth="1"
            opacity={run >= SHOT_AT[i] ? 0.35 : 0}
          />
        ))}
        <circle cx={rx} cy={ry} r="10" fill="#b31b1b" opacity={build >= 1 ? 1 : 0} />
        <text x="95" y="610" textAnchor="middle" fill="rgba(235,229,210,0.45)" fontFamily="monospace" fontSize="11">
          START
        </text>
      </svg>
    </div>
  );
}

/* ──────────────  05 Accès : iris  ────────────── */

export function Iris() {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  return (
    <div ref={ref} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div className={`${styles.iris} ${seen && !prefersReducedMotion() ? styles.irisGo : ""}`} />
    </div>
  );
}

/* ──────────────  Bouton légèrement aimanté  ────────────── */

export function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const onMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.18;
    const y = (e.clientY - r.top - r.height / 2) * 0.25;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <span ref={ref} className={styles.magnet} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </span>
  );
}

export { styles as motionStyles };
