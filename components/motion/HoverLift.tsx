"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

const variants: Variants = {
  rest: {
    y: 0,
    boxShadow: "0 0 0 0 rgba(122,0,0,0)",
    borderColor: "rgba(122,0,0,0.5)",
  },
  hover: {
    y: -10,
    boxShadow:
      "0 22px 60px -10px rgba(122,0,0,0.7), 0 0 0 1px rgba(154,0,0,0.85)",
    borderColor: "rgba(154,0,0,0.95)",
    transition: { type: "spring", stiffness: 280, damping: 22 },
  },
};

export function HoverLift({ children, className }: Props) {
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      {children}
    </motion.div>
  );
}

export const iconHoverVariants: Variants = {
  rest: { rotate: 0, scale: 1, color: "#7a0000" },
  hover: {
    rotate: 6,
    scale: 1.18,
    color: "#9a0000",
    transition: { type: "spring", stiffness: 300, damping: 14 },
  },
};
