import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/dal";
import { getShipmentById } from "@/lib/shipments/service";
import { deleteShipmentAction, regenerateShareTokenAction, updateShipmentAction } from "@/actions/shipments";
import { addEventAction, deleteEventAction } from "@/actions/events";
import { StatusBadge } from "@/components/tracking/status-badge";
import { ShipmentForm } from "@/components/admin/shipment-form";
import { EventDrawer } from "@/components/admin/event-drawer";
import { RouteStrip } from "@/components/tracking/route-strip";
import { AdminEventList } from "@/components/admin/admin-event-list";
import { CopyButton } from "@/components/admin/copy-button";
import { DeleteShipmentButton } from "@/components/admin/delete-shipment-button";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";

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
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-[24px] font-semibold tracking-[-0.01em]">{shipment.trackingNumber}</h1>
          <StatusBadge status={shipment.status} />
        </div>

        <RouteStrip
          mode={shipment.mode}
          originPort={shipment.originPort}
          destinationPort={shipment.destinationPort}
          etd={shipment.etd}
          eta={shipment.eta}
        />

        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={shipment.trackingNumber} label="Tracking number" />
          <CopyButton value={trackUrl} label="Tracking link" />
          <CopyButton value={shareUrl} label="Share link" />
          <ActionForm
            action={regenerateShareTokenAction.bind(null, shipment.id)}
            successMessage="Share link regenerated"
          >
            <SubmitButton variant="outline" pendingText="Regenerating…" className="h-9 rounded-md px-3.5 text-sm">
              Regenerate share link
            </SubmitButton>
          </ActionForm>
          <div className="w-full sm:ml-auto sm:w-auto">
            <DeleteShipmentButton
              action={deleteShipmentAction.bind(null, shipment.id)}
              trackingNumber={shipment.trackingNumber}
            />
          </div>
        </div>
      </section>

      <section className="rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[16px] font-semibold">Events</h2>
          <EventDrawer action={addEventAction.bind(null, shipment.id)} />
        </div>
        <div className="p-5">
          <AdminEventList
            events={shipment.events}
            deleteAction={(eventId) => deleteEventAction.bind(null, shipment.id, eventId)}
          />
        </div>
      </section>

      <ShipmentForm
        action={updateShipmentAction.bind(null, shipment.id)}
        shipment={formShipment}
        submitLabel="Save changes"
      />
    </div>
  );
}
