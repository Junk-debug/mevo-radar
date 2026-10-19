import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "solid" | "ghost" | "accent" | "outline";

interface Common {
  variant?: ButtonVariant;
  icon?: IconName;
  /** Full width. */
  block?: boolean;
  className?: string;
  children: ReactNode;
}

type AsButton = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: undefined };
type AsLink = Common & { href: string; external?: boolean; onClick?: () => void };

const classes = ({ variant = "solid", block, className }: Common) =>
  `btn btn--${variant}${block ? " btn--block" : ""}${className ? ` ${className}` : ""}`;

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
  const { variant: _v, icon: _i, block: _b, className: _cn, children: _c, type = "button", ...rest } = props;
  return (
    <button {...rest} type={type} className={classes(props)}>
      {content}
    </button>
  );
}
