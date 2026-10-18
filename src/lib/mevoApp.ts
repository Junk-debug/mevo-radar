// Opening the official MEVO app. It has no https universal links, only the custom scheme
// rowermevo:// (paths from GBFS rental_uris), so each platform needs its own fallback when the
// app is not installed: an Android intent carries a Play Store fallback URL; on iOS we send the
// user to the App Store if the page is still visible shortly after trying the scheme.

const ANDROID_PACKAGE = "com.urbansharing.citybike.gdansk";
export const PLAY_STORE = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
export const APP_STORE = "https://apps.apple.com/pl/app/rowermevo/id6452801246";

export type MevoTarget = { kind: "station"; id: string } | { kind: "vehicle"; id: string } | { kind: "app" };

export type Platform = "android" | "ios" | "desktop";

export function platform(): Platform {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}

const pathOf = (t: MevoTarget) => (t.kind === "station" ? `stations/${t.id}` : t.kind === "vehicle" ? `vehicles/${t.id}` : "");

/** Link that opens the app on this platform, or null on desktop (there is no MEVO app there). */
export function mevoAppHref(target: MevoTarget, p: Platform = platform()): string | null {
  const path = pathOf(target);
  if (p === "android") {
    return `intent://${path}#Intent;scheme=rowermevo;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE)};end`;
  }
  if (p === "ios") return `rowermevo://${path}`;
  return null;
}

/** iOS can't tell us whether the scheme worked; if we are still on the page, the app is missing. */
export function iosStoreFallback() {
  const timer = setTimeout(() => {
    if (document.visibilityState === "visible") location.href = APP_STORE;
  }, 1500);
  const cancel = () => clearTimeout(timer);
  document.addEventListener("visibilitychange", cancel, { once: true });
  window.addEventListener("pagehide", cancel, { once: true });
}
