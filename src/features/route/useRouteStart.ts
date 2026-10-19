import { useI18n } from "../../i18n";
import { useLocationStore } from "../../store/location";
import { useRouteStore, type PlaceValue } from "../../store/route";

/** The chosen start, or "my location" while none is chosen and the position is known. */
export function useRouteStart(): PlaceValue | null {
  const { t } = useI18n();
  const from = useRouteStore((s) => s.from);
  const pos = useLocationStore((s) => s.pos);
  return from ?? (pos ? { label: t("myLocation"), coords: pos, kind: "me" } : null);
}
