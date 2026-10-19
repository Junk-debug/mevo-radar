import { useRef, type MouseEvent, type PointerEvent, type RefObject } from "react";
import type { SheetState } from "@/store/ui";
import { isPhone } from "./viewport";

const START = 6; // px of movement before a press becomes a drag (so taps on tabs still work)
const STEP = 60; // px to move one step (peek ↔ half ↔ full)
const JUMP = 280; // px to skip a step (full → peek, peek → full)

/** Swipe the phone sheet by its top area; it follows the finger and snaps on release. */
export function useSheetDrag(sheet: RefObject<HTMLElement | null>, state: SheetState, setState: (s: SheetState) => void) {
  const drag = useRef<{ y: number; id: number; active: boolean; height: number } | null>(null);
  const justDragged = useRef(false);

  const onPointerDown = (e: PointerEvent) => {
    if (!isPhone() || e.button !== 0) return;
    drag.current = { y: e.clientY, id: e.pointerId, active: false, height: sheet.current?.offsetHeight ?? 0 };
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    const el = sheet.current;
    if (!d || d.id !== e.pointerId || !el) return;
    const dy = e.clientY - d.y;
    if (!d.active && Math.abs(dy) > START) {
      d.active = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // pointer already released; the drag still works without capture
      }
      el.classList.add("dragging");
    }
    if (!d.active) return;
    if (dy > 0 && state !== "peek") el.style.transform = `translateY(${dy}px)`;
    else if (dy < 0 && state === "half") el.style.maxHeight = `${Math.min(window.innerHeight, d.height - dy)}px`;
  };

  const end = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    const dy = e.clientY - d.y;
    const el = sheet.current;
    if (el) {
      el.style.transform = "";
      el.style.maxHeight = "";
      el.classList.remove("dragging");
    }
    if (dy > JUMP && state === "full") setState("peek");
    else if (dy > STEP) setState(state === "full" ? "half" : "peek");
    else if (dy < -JUMP && state === "peek") setState("full");
    else if (dy < -STEP) setState(state === "peek" ? "half" : "full");
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerCancel: end,
    // A drag that ends over a tab must not also switch the tab.
    onClickCapture: (e: MouseEvent) => {
      if (justDragged.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };
}
