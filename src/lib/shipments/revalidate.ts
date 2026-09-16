import { revalidatePath } from "next/cache";

/** Revalidates every route that renders a shipment: admin list, admin detail, and both public tracking pages. */
export function revalidateShipment(id: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/shipments/${id}`);
  revalidatePath("/track/[trackingNumber]", "page");
  revalidatePath("/t/[shareToken]", "page");
}
