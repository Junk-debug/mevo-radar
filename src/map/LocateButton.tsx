import { useI18n } from "../i18n";
import { useLocationStore } from "../store/location";
import { useUi } from "../store/ui";

export function LocateButton() {
  const { t } = useI18n();
  const { pos, status, hint, locate } = useLocationStore();
  return (
    <>
      <button
        type="button"
        className={`locate-btn${pos ? " on" : ""}${status === "locating" ? " busy" : ""}`}
        onClick={async () => {
          const found = await locate();
          if (found) useUi.getState().focusOn(found, 16);
        }}
        aria-label={t("whereAmI")}
        title={t("whereAmI")}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {hint && (
        <p className="map-toast locate-hint" role="status">
          {t(status === "denied" ? "locationDenied" : "locationUnavailable")}
        </p>
      )}
    </>
  );
}
