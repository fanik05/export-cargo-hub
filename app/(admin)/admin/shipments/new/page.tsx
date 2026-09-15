import { requireAdmin } from "@/lib/dal";
import { createShipmentAction } from "@/actions/shipments";
import { ShipmentForm } from "@/components/admin/shipment-form";

export default async function NewShipmentPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">New shipment</h1>
      <ShipmentForm action={createShipmentAction} submitLabel="Create shipment" />
    </div>
  );
}
