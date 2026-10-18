import { useI18n } from "../i18n";
import { iosStoreFallback, mevoAppHref, platform, type MevoTarget } from "../lib/mevoApp";

/** "Open in MEVO" — shown on phones only; desktop has no MEVO app to open. */
export function OpenInMevo({ target, className = "btn mevo" }: { target: MevoTarget; className?: string }) {
  const { t } = useI18n();
  const p = platform();
  const href = mevoAppHref(target, p);
  if (!href) return null;
  return (
    <a className={className} href={href} onClick={p === "ios" ? iosStoreFallback : undefined}>
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t("openInMevo")}
    </a>
  );
}
