import { normalizeNumber } from "@/lib/bikeNumber";
import { useBikeStore } from "@/store/bike";
import { useUi } from "@/store/ui";

const numberFromHash = () => normalizeNumber(decodeURIComponent(location.hash.slice(1))) || null;

function follow(number: string) {
  useBikeStore.getState().setTracked(number);
  useUi.getState().showTab("bike");
}

/**
 * Keeps the URL hash and the tracked bike in sync, so `mevoradar.pl/#e4937` opens on that bike.
 * Runs after the store has restored the last visit's bike, so a link wins over it.
 */
export function syncBikeLinks() {
  const linked = numberFromHash();
  if (linked) follow(linked);

  useBikeStore.subscribe((state, prev) => {
    if (state.trackedNumber === prev.trackedNumber) return;
    history.replaceState(null, "", state.trackedNumber ? `#${state.trackedNumber}` : location.pathname);
  });

  window.addEventListener("hashchange", () => {
    const number = numberFromHash();
    if (number && number !== useBikeStore.getState().trackedNumber) follow(number);
  });
}
