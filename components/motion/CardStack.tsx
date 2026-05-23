"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariantsBase = (reduce: boolean): Variants => ({
  hidden: { opacity: 0, y: reduce ? 0 : 60 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease },
  },
});

type StackProps = {
  children: ReactNode;
  className?: string;
  threshold?: number;
};

export function CardStack({ children, className, threshold = 0.15 }: StackProps) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: threshold }}
    >
      {children}
    </motion.div>
  );
}

type ItemProps = {
  children: ReactNode;
  className?: string;
};

export function CardItem({ children, className }: ItemProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={itemVariantsBase(reduce ?? false)}>
      {children}
    </motion.div>
  );
}
