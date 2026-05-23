"use client";

import { useEffect, useState } from "react";

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*<>/\\|=+-".split("");

type Props = {
  text: string;
  delay?: number; // seconds before starting
  duration?: number; // seconds to lock all letters
  className?: string;
  start?: boolean; // gate the animation
};

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function scrambled(text: string) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    out += c === " " || c === "\n" ? c : randomChar();
  }
  return out;
}

export function ScrambleText({
  text,
  delay = 0,
  duration = 1.4,
  className,
  start = true,
}: Props) {
  // SSR-safe: initial render shows real text. Effect immediately swaps to scramble.
  const [display, setDisplay] = useState(text);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!start) return;
    setDone(false);
    setDisplay(scrambled(text));

    const startAt = performance.now() + delay * 1000;
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - startAt;
      if (elapsed < 0) {
        setDisplay(scrambled(text));
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, elapsed / (duration * 1000));
      const lockedCount = Math.floor(text.length * progress);
      let result = "";
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === " " || c === "\n") {
          result += c;
          continue;
        }
        result += i < lockedCount ? c : randomChar();
      }
      setDisplay(result);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
        setDone(true);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay, duration, start]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden style={{ opacity: done ? 1 : 0.95 }}>
        {display}
      </span>
    </span>
  );
}
