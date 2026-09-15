import type { PublicShipment } from "@/lib/tracking/public";
import { StatusBadge } from "@/components/tracking/status-badge";
import { EventTimeline } from "@/components/tracking/event-timeline";
import { TrackSearch } from "@/components/tracking/track-search";
import { RouteStrip } from "@/components/admin/route-strip";

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export function TrackingView({ shipment }: { shipment: PublicShipment }) {
  return (
    <>
      {/* The navy band continues from the layout header so a visitor can look up another number. */}
      <div className="bg-navy">
        <div className="mx-auto flex w-full max-w-3xl justify-start px-4 pb-5 sm:justify-end sm:px-6">
          <TrackSearch compact />
        </div>
      </div>

      <article className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
        <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-[24px] font-semibold tracking-[-0.01em]">
              {shipment.trackingNumber}
            </h1>
            <StatusBadge status={shipment.status} />
          </div>
          <RouteStrip
            mode={shipment.mode}
            originPort={shipment.originPort}
            destinationPort={shipment.destinationPort}
            etd={shipment.etd}
            eta={shipment.eta}
          />
        </section>

        <section className="rounded-md border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 text-[16px] font-semibold">Shipment details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 md:grid-cols-4">
            <Fact label="Shipper" value={shipment.shipperName} />
            <Fact label="Consignee" value={shipment.consigneeName} />
            <Fact label="Carrier" value={shipment.carrier} />
            <Fact label={shipment.mode === "AIR" ? "AWB" : "B/L"} value={shipment.masterRef} />
            <Fact label="Pieces" value={shipment.pieces} />
            <Fact label="Weight" value={shipment.weightKg ? `${shipment.weightKg} kg` : null} />
          </dl>
        </section>

        <section className="rounded-md border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 text-[16px] font-semibold">History</h2>
          <div className="p-5">
            <EventTimeline events={shipment.events} />
          </div>
        </section>
      </article>
    </>
  );
}
