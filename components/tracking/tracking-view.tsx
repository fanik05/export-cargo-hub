import type { PublicShipment } from "@/lib/tracking/public";
import { formatDate, modeLabel } from "@/lib/format";
import { StatusBadge } from "@/components/tracking/status-badge";
import { EventTimeline } from "@/components/tracking/event-timeline";

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export function TrackingView({ shipment }: { shipment: PublicShipment }) {
  return (
    <article className="flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3 border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{modeLabel(shipment.mode)} freight</div>
            <h1 className="font-mono text-xl font-semibold">{shipment.trackingNumber}</h1>
          </div>
          <StatusBadge status={shipment.status} className="text-sm" />
        </div>
        <div className="text-base">
          {shipment.originPort} <span className="text-muted-foreground">→</span> {shipment.destinationPort}
        </div>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Fact label="Shipper" value={shipment.shipperName} />
          <Fact label="Consignee" value={shipment.consigneeName} />
          <Fact label="Carrier" value={shipment.carrier} />
          <Fact label={shipment.mode === "AIR" ? "AWB" : "B/L"} value={shipment.masterRef} />
          <Fact label="ETD" value={formatDate(shipment.etd)} />
          <Fact label="ETA" value={formatDate(shipment.eta)} />
          <Fact label="Pieces" value={shipment.pieces} />
          <Fact label="Weight" value={shipment.weightKg ? `${shipment.weightKg} kg` : null} />
        </dl>
      </header>
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Shipment history</h2>
        <EventTimeline events={shipment.events} />
      </section>
    </article>
  );
}
