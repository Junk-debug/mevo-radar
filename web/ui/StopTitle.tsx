/** A station (or bike) name in the stamped-plate style, with its address under it. */
export function StopTitle({ as: Heading, name, address }: { as: "h2" | "h3"; name: string; address?: string }) {
  return (
    <>
      <Heading className="m-0 font-mono font-bold text-[18px]/[1.15] tracking-[0.03em] text-balance">{name}</Heading>
      {address !== undefined && <p className="mt-[-2px] mx-0 mb-0 text-muted text-[13px]">{address}</p>}
    </>
  );
}
