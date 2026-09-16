import { cn } from "@/lib/utils";

/**
 * Three container flutes rising to the right: cargo, and a shipment moving through
 * its milestones. The leading flute is amber, the same colour the newest event
 * carries on every timeline in the app.
 *
 * `tone="inverse"` swaps the navy tile for a translucent one so the mark keeps its
 * shape when it sits on a navy band.
 */
export function LogoMark({
  tone = "brand",
  className,
}: {
  tone?: "brand" | "inverse";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect
        width="24"
        height="24"
        rx="6"
        className={tone === "inverse" ? "fill-white/15" : "fill-navy"}
      />
      <rect x="6.5" y="13" width="3" height="5" rx="1.5" className="fill-white/45" />
      <rect x="10.5" y="10" width="3" height="8" rx="1.5" className="fill-white/70" />
      <rect x="14.5" y="6" width="3" height="12" rx="1.5" className="fill-amber" />
    </svg>
  );
}

export function Logo({
  tone = "brand",
  className,
  markClassName,
}: {
  tone?: "brand" | "inverse";
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} className={markClassName} />
      <span className="text-[16px] font-semibold tracking-[-0.01em]">Export Cargo Hub</span>
    </span>
  );
}
