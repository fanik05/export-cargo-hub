"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { ShipmentRow } from "@/lib/shipments/service";
import type { PublicShipment } from "@/lib/tracking/public";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/tracking/status-badge";
import { RouteStrip } from "@/components/tracking/route-strip";
import { EventTimeline } from "@/components/tracking/event-timeline";

type LoadState =
  | { kind: "loading" }
  | { kind: "loaded"; shipment: PublicShipment }
  | { kind: "error" };

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`h-4 animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

/**
 * Opens a right-hand panel with a read-only summary of one shipment from the list.
 * The header comes from the row already on the page; the rest is fetched each time it opens,
 * so edits made on the full page are reflected without reloading the list.
 */
export function ShipmentPreviewDrawer({ row }: { row: ShipmentRow }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  // Bumped on every open/close so a slow response for a closed panel is ignored.
  const generation = useRef(0);

  const load = () => {
    const gen = ++generation.current;
    setState({ kind: "loading" });
    fetch(`/api/track/${encodeURIComponent(row.trackingNumber)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as PublicShipment;
      })
      .then((shipment) => {
        if (gen === generation.current) setState({ kind: "loaded", shipment });
      })
      .catch(() => {
        if (gen === generation.current) setState({ kind: "error" });
      });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) load();
    else generation.current++;
  };

  const detailHref = `/admin/shipments/${row.id}`;
  const loaded = state.kind === "loaded" ? state.shipment : null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="rounded-md font-mono font-medium text-primary underline-offset-4 hover:underline"
          />
        }
      >
        {row.trackingNumber}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex flex-col overflow-y-auto bg-card text-sm data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]"
      >
        <SheetHeader className="border-b border-border p-5 pr-14">
          <div className="flex flex-wrap items-center gap-3">
            <SheetTitle className="font-mono text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              {row.trackingNumber}
            </SheetTitle>
            <StatusBadge status={loaded?.status ?? row.status} />
          </div>
          <SheetDescription className="text-[13px] text-muted-foreground">
            {row.shipperName} to {row.consigneeName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 p-5">
          <RouteStrip
            mode={row.mode}
            originPort={row.originPort}
            destinationPort={row.destinationPort}
            etd={loaded?.etd ?? null}
            eta={loaded?.eta ?? row.eta}
            className="sm:flex-col sm:items-start"
          />

          {state.kind === "error" ? (
            <p className="text-sm text-destructive">
              Could not load this shipment. Open the full page instead.
            </p>
          ) : (
            <>
              <section className="flex flex-col gap-3">
                <h3 className="text-[13px] font-medium text-muted-foreground">Shipment details</h3>
                {loaded ? (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Fact label="Carrier" value={loaded.carrier} />
                    <Fact label={loaded.mode === "AIR" ? "AWB" : "B/L"} value={loaded.masterRef} />
                    <Fact label="Pieces" value={loaded.pieces} />
                    <Fact label="Weight" value={loaded.weightKg ? `${loaded.weightKg} kg` : null} />
                  </dl>
                ) : (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4" aria-busy>
                    <SkeletonLine className="w-24" />
                    <SkeletonLine className="w-28" />
                    <SkeletonLine className="w-16" />
                    <SkeletonLine className="w-20" />
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-3">
                <h3 className="text-[13px] font-medium text-muted-foreground">History</h3>
                {loaded ? (
                  <EventTimeline events={loaded.events} />
                ) : (
                  <div className="flex flex-col gap-3" aria-busy>
                    <SkeletonLine className="w-40" />
                    <SkeletonLine className="w-32" />
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div className="border-t border-border p-5">
          <Button
            render={<Link href={detailHref} />}
            nativeButton={false}
            className="h-9 w-full rounded-md text-sm"
          >
            Open shipment
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
