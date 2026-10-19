import { useI18n } from "../i18n";
import { iosStoreFallback, mevoAppHref, platform, type MevoTarget } from "../lib/mevoApp";
import { Button } from "../ui";

/** "Open in MEVO" — shown on phones only; desktop has no MEVO app to open. */
export function OpenInMevo({ target }: { target: MevoTarget }) {
  const { t } = useI18n();
  const p = platform();
  const href = mevoAppHref(target, p);
  if (!href) return null;
  return (
    <Button variant="accent" icon="external" href={href} onClick={p === "ios" ? iosStoreFallback : undefined}>
      {t("openInMevo")}
    </Button>
  );
}
