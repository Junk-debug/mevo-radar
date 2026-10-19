import { useI18n } from "../i18n";
import { useLocationStore } from "../store/location";
import { useUi } from "../store/ui";
import { IconButton } from "../ui";

export function LocateButton() {
  const { t } = useI18n();
  const { pos, status, hint, locate } = useLocationStore();
  return (
    <>
      <IconButton
        icon="crosshair"
        variant="map"
        className={`locate-btn${pos ? " on" : ""}${status === "locating" ? " busy" : ""}`}
        label={t("whereAmI")}
        onClick={async () => {
          const found = await locate();
          if (found) useUi.getState().focusOn(found, 16);
        }}
      />
      {hint && (
        <p className="map-toast locate-hint" role="status">
          {t(status === "denied" ? "locationDenied" : "locationUnavailable")}
        </p>
      )}
    </>
  );
}
