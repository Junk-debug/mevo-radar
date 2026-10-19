import { useI18n } from "@/i18n";
import { useLocationStore } from "@/store/location";
import { useUi } from "@/store/ui";
import { IconButton } from "@/ui";
import { MapToast } from "./MapToast";

export function LocateButton() {
  const { t } = useI18n();
  const { pos, status, hint, locate } = useLocationStore();
  return (
    <>
      {/* data-* state, so its colour outranks the map variant's own text colour. */}
      <IconButton
        icon="crosshair"
        variant="map"
        className="absolute z-1 top-[calc(80px_+_env(safe-area-inset-top,0px))] right-[max(10px,env(safe-area-inset-right,0px))] data-located:text-me data-busy:*:animate-spin motion-reduce:*:animate-none"
        data-located={pos ? "" : undefined}
        data-busy={status === "locating" ? "" : undefined}
        label={t("whereAmI")}
        onClick={async () => {
          const found = await locate();
          if (found) useUi.getState().focusOn(found, 16);
        }}
      />
      {hint && (
        <MapToast placement="beside-locate" as="p">
          {t(status === "denied" ? "locationDenied" : "locationUnavailable")}
        </MapToast>
      )}
    </>
  );
}
