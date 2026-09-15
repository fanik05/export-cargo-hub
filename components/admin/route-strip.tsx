import { AirplaneIcon, ArrowRightIcon, BoatIcon } from "@phosphor-icons/react/dist/ssr";
import type { ShipmentMode } from "@/lib/generated/prisma/client";
import { formatDate, modeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  mode: ShipmentMode;
  originPort: string;
  destinationPort: string;
  etd: Date | string | null;
  eta: Date | string | null;
  className?: string;
};

/** The one loud element in the interface: the navy leg card, shared by admin and public. */
export function RouteStrip({ mode, originPort, destinationPort, etd, eta, className }: Props) {
  const ModeIcon = mode === "AIR" ? AirplaneIcon : BoatIcon;
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-md bg-navy px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ModeIcon aria-hidden className="size-5 shrink-0 text-amber" />
        <span className="sr-only">{modeLabel(mode)} freight</span>
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[16px] font-semibold">
          <span>{originPort}</span>
          <ArrowRightIcon aria-hidden className="size-4 shrink-0 text-amber" />
          <span>{destinationPort}</span>
        </p>
      </div>
      <dl className="flex shrink-0 gap-6 text-[13px] text-white/70 sm:flex-col sm:gap-0.5 sm:text-right">
        <div className="flex gap-2 sm:justify-end">
          <dt>ETD</dt>
          <dd className="text-white">{formatDate(etd)}</dd>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <dt>ETA</dt>
          <dd className="text-white">{formatDate(eta)}</dd>
        </div>
      </dl>
    </div>
  );
}
