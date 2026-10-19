import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";
import { cx } from "./cx";

type Variant = "plain" | "round" | "map";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconName;
  label: string;
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  plain: "size-8 border-0 rounded-sm bg-transparent text-muted hover:text-ink hover:bg-surface-2",
  round: "size-[30px] border border-line rounded-full bg-surface text-ink disabled:opacity-40 disabled:cursor-default",
  // Matches MapLibre's own controls, which stay light in both themes.
  map: "size-[29px] border-0 rounded-[4px] bg-white text-[#333] shadow-[0_0_0_2px_rgb(0_0_0/0.1)]",
};

export function IconButton({ icon, label, variant = "plain", className, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx("grid place-items-center flex-none p-0 cursor-pointer", VARIANTS[variant], className)}
    >
      <Icon name={icon} size={variant === "round" ? 16 : 18} />
    </button>
  );
}
