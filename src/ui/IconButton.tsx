import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconName;
  /** Accessible name and tooltip. */
  label: string;
  variant?: "plain" | "round" | "map";
}

export function IconButton({ icon, label, variant = "plain", className, ...rest }: Props) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={`icon-btn icon-btn--${variant}${className ? ` ${className}` : ""}`}>
      <Icon name={icon} size={variant === "round" ? 16 : 18} />
    </button>
  );
}
