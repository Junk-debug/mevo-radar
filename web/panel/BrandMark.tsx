export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="flex-none" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect className="fill-accent" width="32" height="32" rx="9" />
      <g className="fill-none stroke-accent-ink" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9.5" cy="20" r="5" />
        <circle cx="22.5" cy="20" r="5" />
        <path d="M9.5 20l5-8.5h6.5l1.5 8.5M12.5 11.5h4.5" />
      </g>
    </svg>
  );
}
