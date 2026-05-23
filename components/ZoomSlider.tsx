"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";

type Props = {
  children: ReactNode;
};

const slideVariants: Variants = {
  initial: { opacity: 0, scale: 1 },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      opacity: { duration: 0.5, delay: 0.5, ease: "easeOut" },
    },
  },
  exit: {
    opacity: 0,
    scale: 8,
    transition: {
      scale: { duration: 0.8, ease: [0.76, 0, 0.24, 1] },
      opacity: { duration: 0.3, delay: 0.5, ease: [0.76, 0, 0.24, 1] },
    },
  },
};

const INTERACTIVE_SELECTOR =
  "button, a, input, textarea, label, select, form, [data-no-zoom]";

export function ZoomSlider({ children }: Props) {
  const slides = Children.toArray(children);
  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const isLast = index >= total - 1;

  const goNext = useCallback(() => {
    setLocked((wasLocked) => {
      if (wasLocked) return wasLocked;
      setIndex((i) => {
        if (i >= total - 1) return i;
        return i + 1;
      });
      window.setTimeout(() => setLocked(false), 1000);
      return true;
    });
  }, [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowRight" ||
        e.key === "PageDown" ||
        e.key === " "
      ) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext]);

  useEffect(() => {
    function onStart(e: TouchEvent) {
      touchStartY.current = e.touches[0]?.clientY ?? null;
    }
    function onEnd(e: TouchEvent) {
      const start = touchStartY.current;
      touchStartY.current = null;
      if (start == null) return;
      const end = e.changedTouches[0]?.clientY ?? start;
      if (end - start < -50) goNext();
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [goNext]);

  function onSlideClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    goNext();
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="zoom-slide absolute inset-0 cursor-pointer"
          variants={slideVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          onClick={onSlideClick}
          style={{ transformOrigin: "center center", willChange: "transform" }}
        >
          {slides[index]}
        </motion.div>
      </AnimatePresence>

      <div
        aria-hidden
        className="pointer-events-none fixed right-5 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3 md:right-10 md:gap-4"
      >
        {slides.map((_, i) => (
          <motion.span
            key={i}
            className="block h-2 w-2"
            animate={{
              backgroundColor:
                i === index ? "#7A0000" : "rgba(255,255,255,0.18)",
              scale: i === index ? 1.4 : 1,
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>

      <AnimatePresence>
        {!isLast && (
          <motion.button
            key="next-btn"
            data-no-zoom
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 border border-white/20 bg-black/40 px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-sm transition-colors hover:border-accent-bright hover:bg-accent-deep md:bottom-10 md:right-10 md:text-xs"
            aria-label="Slide suivant"
          >
            Suivant
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
