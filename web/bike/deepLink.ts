import { numberFromHash, useBikeStore } from "@/store/bike";
import { useUi } from "@/store/ui";

/** Editing "#e4937" in the address bar of an open page follows that bike. */
export function listenToBikeLinks() {
  window.addEventListener("hashchange", () => {
    const number = numberFromHash();
    if (!number || number === useBikeStore.getState().tracked) return;
    useBikeStore.getState().setTracked(number);
    useUi.getState().showTab("bike");
  });
}
