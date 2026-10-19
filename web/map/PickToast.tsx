import { useI18n } from "@/i18n";
import { useRouteStore } from "@/store/route";
import { useUi } from "@/store/ui";
import { MapToast } from "./MapToast";

export function PickToast() {
  const { t } = useI18n();
  const picking = useRouteStore((s) => s.picking);
  if (!picking) return null;
  return (
    <MapToast placement="top">
      <span>{t(picking === "from" ? "pickingStart" : "pickingDestination")}</span>
      <button
        type="button"
        className="border-0 rounded-full px-2.5 py-[5px] bg-surface/18 text-inherit font-semibold"
        onClick={() => {
          useRouteStore.getState().setPicking(null);
          useUi.getState().openSheet();
        }}
      >
        {t("cancel")}
      </button>
    </MapToast>
  );
}
