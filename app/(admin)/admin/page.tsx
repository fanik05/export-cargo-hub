import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { listShipments } from "@/lib/shipments/service";
import { EVENT_TYPES } from "@/lib/tracking/status";
import type { EventType } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/admin/search-form";
import { ShipmentTable } from "@/components/admin/shipment-table";

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function AdminShipmentsPage(props: PageProps<"/admin">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const q = first(sp.q);
  const statusRaw = first(sp.status);
  const status = (EVENT_TYPES as readonly string[]).includes(statusRaw) ? (statusRaw as EventType) : undefined;
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const { rows, hasMore } = await listShipments({ q, status, page });

  const nextParams = new URLSearchParams();
  if (q) nextParams.set("q", q);
  if (status) nextParams.set("status", status);
  nextParams.set("page", String(page + 1));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Shipments</h1>
        <Button render={<Link href="/admin/shipments/new" />} size="sm">New shipment</Button>
      </div>
      <SearchForm q={q} status={status ?? ""} />
      <ShipmentTable rows={rows} />
      {hasMore && (
        <div className="flex justify-center">
          <Button render={<Link href={`/admin?${nextParams}`} />} variant="outline" size="sm">Load more</Button>
        </div>
      )}
    </div>
  );
}
