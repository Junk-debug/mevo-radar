import { cx } from "./cx";

type Size = "md" | "sm";

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: Size;
}

const GROUP: Record<Size, string> = {
  md: "grid p-[3px] gap-[3px] rounded-md bg-surface-2 border border-line",
  sm: "inline-grid p-[2px] rounded-full border border-line",
};

const OPTION: Record<Size, string> = {
  md: "px-1 py-[7px] rounded-[9px] text-[14px] font-medium aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-[0_1px_3px_rgb(13_27_42/0.12)] aria-checked:font-semibold",
  sm: "px-2 py-[3px] rounded-full font-mono text-[11px]/[1.2] font-semibold aria-checked:bg-ink aria-checked:text-surface",
};

export function Segmented<T extends string>({ options, value, onChange, label, size = "md" }: Props<T>) {
  return (
    <div className={cx("auto-cols-[1fr] grid-flow-col", GROUP[size])} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cx("border-0 bg-transparent text-muted cursor-pointer", OPTION[size])}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
