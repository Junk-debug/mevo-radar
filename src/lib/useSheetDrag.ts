import { useRef, type MouseEvent, type PointerEvent, type RefObject } from "react";

const START = 6; // px of movement before a press becomes a drag (so taps on tabs still work)
const CLOSE = 70; // drag down this far on an open sheet to collapse it
const OPEN = 40; // swipe up this far on a collapsed sheet to open it

/**
 * Swipe the phone bottom sheet open/closed by its top area (grabber, header, tabs).
 * While open, the sheet follows the finger downwards; on release it snaps.
 */
export function useSheetDrag(sheet: RefObject<HTMLElement | null>, open: boolean, setOpen: (v: boolean) => void) {
  const drag = useRef<{ y: number; id: number; active: boolean } | null>(null);
  const justDragged = useRef(false);

  const onPointerDown = (e: PointerEvent) => {
    if (!window.matchMedia("(max-width: 899px)").matches || e.button !== 0) return;
    drag.current = { y: e.clientY, id: e.pointerId, active: false };
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.y;
    if (!d.active && Math.abs(dy) > START) {
      d.active = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // pointer already released; the drag still works without capture
      }
      sheet.current?.classList.add("dragging");
    }
    if (d.active && open && sheet.current) sheet.current.style.transform = `translateY(${Math.max(0, dy)}px)`;
  };

  const end = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    const dy = e.clientY - d.y;
    if (sheet.current) {
      sheet.current.style.transform = "";
      sheet.current.classList.remove("dragging");
    }
    if (open && dy > CLOSE) setOpen(false);
    else if (!open && dy < -OPEN) setOpen(true);
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
