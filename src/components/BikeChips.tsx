import type { Bike } from "../../shared/types";
import { useI18n } from "../i18n";

/** Frame numbers as tappable chips, with a battery gauge for e-bikes. */
export function BikeChips({ bikes, onPick, selected }: { bikes: Bike[]; onPick: (n: string) => void; selected?: string | null }) {
  const { t } = useI18n();
  return (
    <ul className="chips">
      {bikes.map((b) => (
        <li key={b.number}>
          <button
            type="button"
            className={`chip ${b.type}${b.available ? "" : " off"}${selected === b.number.toLowerCase() ? " sel" : ""}`}
            onClick={() => onPick(b.number)}
            title={b.available ? undefined : t("unavailableBike")}
          >
            <span className="chip-num">{b.number}</span>
            {b.type === "ebike" && b.battery != null && (
              <span className="chip-bat" aria-label={`${t("battery")} ${b.battery}%`}>
                <i style={{ width: `${b.battery}%` }} />
                {b.battery}%
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
