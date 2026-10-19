import type { ReactNode } from "react";
import { cx } from "@/components/ui";

type Placement = "top" | "beside-locate";

const PLACEMENT: Record<Placement, string> = {
  top: "top-[calc(12px_+_env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 max-w-[calc(100%_-_120px)] rounded-full",
  "beside-locate":
    "top-[calc(80px_+_env(safe-area-inset-top,0px))] right-[calc(max(10px,env(safe-area-inset-right,0px))_+_38px)] max-w-[240px] rounded-sm",
};

/** A dark status bubble over the map. */
export function MapToast({ placement, as: Tag = "div", children }: { placement: Placement; as?: "div" | "p"; children: ReactNode }) {
  return (
    <Tag
      role="status"
      className={cx(
        "absolute z-3 flex items-center gap-3 py-[9px] pr-2.5 pl-3.5 bg-ink text-surface text-[13.5px] shadow-panel",
        PLACEMENT[placement],
      )}
    >
      {children}
    </Tag>
  );
}
