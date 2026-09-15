import { requireAdmin } from "@/lib/dal";
import { createShipmentAction } from "@/actions/shipments";
import { ShipmentForm } from "@/components/admin/shipment-form";

export default async function NewShipmentPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em]">New shipment</h1>
      <ShipmentForm
        action={createShipmentAction}
        submitLabel="Create shipment"
        successMessage="Shipment created"
      />
    </div>
  );
}
