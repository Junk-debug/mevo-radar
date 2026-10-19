import type { ReactNode } from "react";
import { cx } from "./cx";

type Tone = "ok" | "warn" | "gone";

const TONES: Record<Tone, string> = {
  ok: "text-ok bg-ok/13",
  warn: "text-low bg-low/15",
  gone: "text-gone bg-gone/12",
};

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "justify-self-start inline-flex items-center gap-[7px] px-2.5 py-1 rounded-full text-[12.5px] font-semibold",
        "before:content-[''] before:size-[7px] before:rounded-full before:bg-current",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
