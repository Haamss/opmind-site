"use client";

import { motion } from "framer-motion";

type Props = {
  src?: string;
  alt?: string;
  label?: string;
  className?: string;
  glow?: boolean;
  pulse?: boolean;
};

export function PhoneFrame({
  src,
  alt = "OpMind app",
  label = "Screenshot App",
  className = "",
  glow = false,
  pulse = false,
}: Props) {
  return (
    <div className={`relative ${className}`}>
      {/* Outer pulsing glow */}
      {pulse && (
        <motion.div
          aria-hidden
          className="absolute -inset-10 -z-10 bg-accent-bright/35 blur-[100px]"
          animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.95, 1.08, 0.95] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Phone outer body */}
      <div
        className={
          "relative aspect-[9/19.5] border border-accent/55 bg-bg-1 p-2 " +
          (glow ? "accent-glow-strong" : "")
        }
      >
        {/* Notch */}
        <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 bg-black" />

        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden bg-black">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-bg-3 px-6 text-center">
              <svg
                className="h-10 w-10 text-text-dim"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              >
                <rect x="3" y="3" width="18" height="18" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L9 18" />
              </svg>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted">
                Screenshot App
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
                {label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
