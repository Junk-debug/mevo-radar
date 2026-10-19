import type { Bike } from "@shared/types";
import { cx } from "@/components/ui";
import { useI18n } from "@/i18n";

// Border colour priority: hover > selected > e-bike > plain.
const chipBorder = (b: Bike, selected: boolean) =>
  selected ? "border-accent shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
  : b.type === "ebike" ? "border-[color-mix(in_srgb,var(--ebike)_45%,var(--line))]"
  : "border-line";

export function BikeChips({ bikes, onPick, selected }: { bikes: Bike[]; onPick: (n: string) => void; selected?: string | null }) {
  const { t } = useI18n();
  return (
    <ul className="list-none m-0 p-0 flex flex-wrap gap-1.5">
      {bikes.map((b) => (
        <li key={b.number}>
          <button
            type="button"
            className={cx(
              "inline-flex items-center gap-2 px-[9px] py-[5px] rounded-sm border bg-surface font-mono font-semibold text-[12.5px]/[normal] hover:border-ink",
              chipBorder(b, selected === b.number.toLowerCase()),
              !b.available && "opacity-50 line-through",
            )}
            onClick={() => onPick(b.number)}
            title={b.available ? undefined : t("unavailableBike")}
          >
            <span>{b.number}</span>
            {b.type === "ebike" && b.battery != null && <span className="font-medium text-muted">{b.battery}%</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
