import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "solid" | "ghost" | "accent" | "outline";

interface Common {
  variant?: ButtonVariant;
  icon?: IconName;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type AsButton = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: undefined };
type AsLink = Common & { href: string; external?: boolean; onClick?: () => void };

const BASE = "items-center justify-center gap-1.5 border no-underline cursor-pointer disabled:opacity-60 disabled:cursor-progress";
const COMPACT = "px-3 py-2 rounded-sm text-[13.5px] font-semibold";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "px-[18px] py-3 rounded-md text-[15px] font-bold border-transparent bg-accent text-accent-ink hover:not-disabled:brightness-106",
  solid: `${COMPACT} border-ink bg-ink text-surface`,
  ghost: `${COMPACT} border-line bg-transparent text-ink hover:border-ink`,
  accent: `${COMPACT} border-accent bg-accent text-accent-ink`,
  outline: "px-3.5 py-[11px] rounded-md text-[15px] font-semibold border-line bg-surface text-ink hover:not-disabled:border-ink",
};

const classes = ({ variant = "solid", fullWidth, className }: Common) =>
  cx(BASE, fullWidth ? "flex w-full" : "inline-flex", VARIANTS[variant], className);

/** A button, or a link styled as one when `href` is given. */
export function Button(props: AsButton | AsLink) {
  const content = (
    <>
      {props.icon && <Icon name={props.icon} size={16} />}
      {props.children}
    </>
  );
  if (props.href !== undefined) {
    const { href, external, onClick } = props;
    return (
      <a className={classes(props)} href={href} onClick={onClick} {...(external ? { target: "_blank", rel: "noopener" } : {})}>
        {content}
      </a>
    );
  }
  const { variant: _v, icon: _i, fullWidth: _f, className: _cn, children: _c, type = "button", ...rest } = props;
  return (
    <button {...rest} type={type} className={classes(props)}>
      {content}
    </button>
  );
}
