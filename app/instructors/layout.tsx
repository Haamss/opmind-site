import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pour les instructeurs — OpMind",
  description:
    "OpMind pour les instructeurs de tir : suivi individuel, assignation de séances, traçabilité exportable. Pour forces de l'ordre, militaires et clubs civils.",
};

export default function InstructorsLayout({ children }: { children: ReactNode }) {
  return children;
}
