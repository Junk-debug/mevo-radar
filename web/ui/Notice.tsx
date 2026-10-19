import type { ReactNode } from "react";
import { cx } from "./cx";

type Tone = "error" | "warn" | "tip";

interface Props {
  tone: Tone;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

const TONES: Record<Tone, string> = {
  error: "bg-gone/12 text-gone",
  warn: "bg-low/16 text-ink",
  tip: "bg-ok/13 text-ink cursor-pointer",
};

export function Notice({ tone, children, onClick, className: extra }: Props) {
  const className = cx("m-0 w-full px-3 py-2.5 border-0 rounded-sm text-[13.5px] text-left", TONES[tone], extra);
  if (onClick) return <button type="button" className={className} onClick={onClick}>{children}</button>;
  return <p className={className} role={tone === "error" ? "alert" : undefined}>{children}</p>;
}
