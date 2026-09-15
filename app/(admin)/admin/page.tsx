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
  const raw = Number(first(sp.page));
  const page = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;

  const { rows, hasMore } = await listShipments({ q, status, page });

  const nextParams = new URLSearchParams();
  if (q) nextParams.set("q", q);
  if (status) nextParams.set("status", status);
  nextParams.set("page", String(page + 1));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Shipments</h1>
        <Button
          render={<Link href="/admin/shipments/new" />}
          className="h-9 rounded-md px-4 text-sm"
        >
          New shipment
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border p-4">
          <SearchForm q={q} status={status ?? ""} />
        </div>
        <ShipmentTable rows={rows} />
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            render={<Link href={`/admin?${nextParams}`} />}
            variant="outline"
            className="h-9 rounded-md px-4 text-sm"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
