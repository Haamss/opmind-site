"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  amount?: number; // px range
};

export function ParallaxTitle({ children, className, amount = 60 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [0, 0] : [amount, -amount]
  );

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className={`relative ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}
