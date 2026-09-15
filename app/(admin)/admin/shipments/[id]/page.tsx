import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/dal";
import { getShipmentById } from "@/lib/shipments/service";
import { deleteShipmentAction, regenerateShareTokenAction, updateShipmentAction } from "@/actions/shipments";
import { addEventAction, deleteEventAction } from "@/actions/events";
import { StatusBadge } from "@/components/tracking/status-badge";
import { ShipmentForm } from "@/components/admin/shipment-form";
import { EventForm } from "@/components/admin/event-form";
import { AdminEventList } from "@/components/admin/admin-event-list";
import { CopyButton } from "@/components/admin/copy-button";
import { DeleteShipmentButton } from "@/components/admin/delete-shipment-button";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { Separator } from "@/components/ui/separator";

async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function ShipmentDetailPage(props: PageProps<"/admin/shipments/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const shipment = await getShipmentById(id);
  if (!shipment) notFound();

  const origin = await baseUrl();
  const shareUrl = `${origin}/t/${shipment.shareToken}`;
  const trackUrl = `${origin}/track/${shipment.trackingNumber}`;
  const formShipment = { ...shipment, weightKg: shipment.weightKg?.toString() ?? null };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-lg font-semibold">{shipment.trackingNumber}</h1>
          <StatusBadge status={shipment.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={shipment.trackingNumber} label="Tracking number" />
          <CopyButton value={trackUrl} label="Tracking link" />
          <CopyButton value={shareUrl} label="Share link" />
          <ActionForm action={regenerateShareTokenAction.bind(null, shipment.id)} successMessage="Share link regenerated">
            <SubmitButton variant="outline" size="sm" pendingText="…">Regenerate share link</SubmitButton>
          </ActionForm>
          <DeleteShipmentButton action={deleteShipmentAction.bind(null, shipment.id)} trackingNumber={shipment.trackingNumber} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Events</h2>
        <EventForm action={addEventAction.bind(null, shipment.id)} />
        <AdminEventList events={shipment.events} deleteAction={(eventId) => deleteEventAction.bind(null, shipment.id, eventId)} />
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Details</h2>
        <ShipmentForm action={updateShipmentAction.bind(null, shipment.id)} shipment={formShipment} submitLabel="Save changes" />
      </section>
    </div>
  );
}
