import Link from "next/link";
import { AirplaneIcon, ArrowRightIcon, BoatIcon } from "@phosphor-icons/react/dist/ssr";
import type { ShipmentRow } from "@/lib/shipments/service";
import { formatDate, modeLabel } from "@/lib/format";
import { StatusBadge } from "@/components/tracking/status-badge";
import { ShipmentPreviewDrawer } from "@/components/admin/shipment-preview-drawer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const headClass = "h-10 bg-muted px-4 text-[13px] font-medium text-muted-foreground";
const cellClass = "px-4 py-3 text-sm";

export function ShipmentTable({ rows }: { rows: ShipmentRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          No shipments match. Clear the filters or create a new shipment.
        </p>
        <Link
          href="/admin/shipments/new"
          className="rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          New shipment
        </Link>
      </div>
    );
  }
  return (
    <Table className="text-sm">
      <TableHeader>
        <TableRow className="hover:bg-muted">
          <TableHead className={headClass}>Tracking number</TableHead>
          <TableHead className={headClass}>Mode</TableHead>
          <TableHead className={headClass}>Shipper and consignee</TableHead>
          <TableHead className={headClass}>Route</TableHead>
          <TableHead className={headClass}>ETA</TableHead>
          <TableHead className={headClass}>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => {
          const ModeIcon = s.mode === "AIR" ? AirplaneIcon : BoatIcon;
          return (
            <TableRow
              key={s.id}
              className="border-b-0 odd:bg-card even:bg-muted/40 hover:bg-amber-soft/40"
            >
              <TableCell className={cellClass}>
                <ShipmentPreviewDrawer row={s} />
              </TableCell>
              <TableCell className={cellClass}>
                <span className="inline-flex items-center gap-2">
                  <ModeIcon aria-hidden className="size-4 text-muted-foreground" />
                  {modeLabel(s.mode)}
                </span>
              </TableCell>
              <TableCell className={cellClass}>
                <span className="block">{s.shipperName}</span>
                <span className="block text-[13px] text-muted-foreground">{s.consigneeName}</span>
              </TableCell>
              <TableCell className={cellClass}>
                <span className="inline-flex items-center gap-2">
                  {s.originPort}
                  <ArrowRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                  {s.destinationPort}
                </span>
              </TableCell>
              <TableCell className={cellClass}>{formatDate(s.eta)}</TableCell>
              <TableCell className={cellClass}>
                <StatusBadge status={s.status} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
