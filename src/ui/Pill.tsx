import type { ReactNode } from "react";

export function Pill({ tone, children }: { tone: "ok" | "warn" | "gone"; children: ReactNode }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}
