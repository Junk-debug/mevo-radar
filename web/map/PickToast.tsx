import { useI18n } from "@/i18n";
import { useRouteStore } from "@/store/route";
import { useUi } from "@/store/ui";

export function PickToast() {
  const { t } = useI18n();
  const picking = useRouteStore((s) => s.picking);
  if (!picking) return null;
  return (
    <div className="map-toast" role="status">
      <span>{t(picking === "from" ? "pickingStart" : "pickingDestination")}</span>
      <button
        type="button"
        onClick={() => {
          useRouteStore.getState().setPicking(null);
          useUi.getState().openSheet();
        }}
      >
        {t("cancel")}
      </button>
    </div>
  );
}
