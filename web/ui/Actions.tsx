import type { ReactNode } from "react";

/** A wrapping row of buttons, e.g. at the bottom of a card. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}
