"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

export function AnimatedBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, i) => ({
        left: (i * 137.5) % 100,
        size: i % 3 === 0 ? 2 : 1,
        delay: (i * 0.7) % 8,
        dur: 16 + (i % 7),
      })),
    []
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Pulsing tactical grid (bordeaux subtle) */}
      <motion.div
        className="absolute inset-0 bg-tactical-grid"
        animate={{ opacity: [0.4, 0.85, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sweep scan line (bordeaux) */}
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent-bright/40 to-transparent"
        initial={{ top: "-5%" }}
        animate={{ top: ["-5%", "105%"] }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 5,
        }}
      />

      {/* Drifting bordeaux particles (look like glowing tracer dots) */}
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: "#9a0000",
            boxShadow: "0 0 8px rgba(154, 0, 0, 0.85)",
          }}
          initial={{ y: "110vh", opacity: 0 }}
          animate={{ y: "-10vh", opacity: [0, 0.85, 0.85, 0] }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />
    </div>
  );
}
