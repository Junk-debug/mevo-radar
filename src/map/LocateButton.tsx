import { useI18n } from "../i18n";
import type { LocationStatus } from "../lib/useLocation";

interface Props {
  status: LocationStatus;
  known: boolean;
  showHint: boolean;
  onClick: () => void;
}

export function LocateButton({ status, known, showHint, onClick }: Props) {
  const { t } = useI18n();
  return (
    <>
      <button
        type="button"
        className={`locate-btn${known ? " on" : ""}${status === "locating" ? " busy" : ""}`}
        onClick={onClick}
        aria-label={t("whereAmI")}
        title={t("whereAmI")}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {showHint && (
        <p className="map-toast locate-hint" role="status">
          {t(status === "denied" ? "locationDenied" : "locationUnavailable")}
        </p>
      )}
    </>
  );
}
