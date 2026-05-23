"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  href?: string;
  type?: "button" | "submit";
  variant?: "primary" | "ghost";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};

const wrapVariants: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: { type: "spring", stiffness: 300, damping: 18 },
  },
  tap: { scale: 0.97 },
};

const glowVariants: Variants = {
  rest: { opacity: 0, scale: 0.85 },
  hover: {
    opacity: 0.75,
    scale: 1.18,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export function ShimmerButton({
  children,
  href,
  type = "button",
  variant = "primary",
  onClick,
  className = "",
  disabled,
}: Props) {
  const base =
    "relative inline-flex items-center justify-center gap-2 px-8 py-4 font-display text-sm font-bold uppercase tracking-[0.12em] overflow-hidden border";
  const variants =
    variant === "primary"
      ? "border-accent bg-accent text-white"
      : "border-white/20 bg-transparent text-white hover:border-accent";

  const content = (
    <>
      {/* bordeaux glow halo on hover */}
      {variant === "primary" && (
        <motion.span
          aria-hidden
          variants={glowVariants}
          className="pointer-events-none absolute -inset-3 -z-10 bg-accent blur-2xl"
        />
      )}
      {/* shimmer sweep — white sheen */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{ x: ["-50%", "450%"] }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 1.6,
        }}
      />
      <span className="relative z-[1] inline-flex items-center gap-2">
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        variants={wrapVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        animate="rest"
        className={`${base} ${variants} ${className}`}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      variants={wrapVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      animate="rest"
      className={`${base} ${variants} disabled:opacity-60 ${className}`}
    >
      {content}
    </motion.button>
  );
}
