import type { ReactNode } from "react";
import { cx } from "./cx";

export function Card({ className, children, live }: { className?: string; children: ReactNode; live?: boolean }) {
  return (
    <section className={cx("grid gap-2.5 p-3.5 rounded-md bg-surface-2", className)} aria-live={live ? "polite" : undefined}>
      {children}
    </section>
  );
}
