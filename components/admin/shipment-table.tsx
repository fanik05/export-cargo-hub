import Link from "next/link";
import type { ShipmentRow } from "@/lib/shipments/service";
import { formatDate, modeLabel } from "@/lib/format";
import { StatusBadge } from "@/components/tracking/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ShipmentTable({ rows }: { rows: ShipmentRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No shipments match.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tracking #</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Shipper → Consignee</TableHead>
          <TableHead>Route</TableHead>
          <TableHead>ETA</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <Link href={`/admin/shipments/${s.id}`} className="font-mono underline-offset-4 hover:underline">{s.trackingNumber}</Link>
            </TableCell>
            <TableCell>{modeLabel(s.mode)}</TableCell>
            <TableCell>{s.shipperName} → {s.consigneeName}</TableCell>
            <TableCell>{s.originPort} → {s.destinationPort}</TableCell>
            <TableCell>{formatDate(s.eta)}</TableCell>
            <TableCell><StatusBadge status={s.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
