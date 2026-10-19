import type { ReactNode } from "react";

interface Props {
  tone: "error" | "warn" | "tip";
  children: ReactNode;
  onClick?: () => void;
}

export function Notice({ tone, children, onClick }: Props) {
  const className = `notice notice--${tone}`;
  if (onClick) return <button type="button" className={className} onClick={onClick}>{children}</button>;
  return <p className={className} role={tone === "error" ? "alert" : undefined}>{children}</p>;
}
