import type { ReactNode } from "react";

export function Card({ className, children, live }: { className?: string; children: ReactNode; live?: boolean }) {
  return (
    <section className={`card${className ? ` ${className}` : ""}`} aria-live={live ? "polite" : undefined}>
      {children}
    </section>
  );
}
