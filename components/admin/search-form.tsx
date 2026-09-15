import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_LABELS, EVENT_TYPES } from "@/lib/tracking/status";

export function SearchForm({ q, status }: { q: string; status: string }) {
  return (
    <form method="get" action="/admin" className="flex flex-wrap items-end gap-2">
      <Input name="q" defaultValue={q} placeholder="Tracking #, shipper, consignee, AWB/BL" className="w-72" aria-label="Search" />
      <select name="status" defaultValue={status} aria-label="Status" className="h-8 border border-input bg-background px-2 text-xs">
        <option value="">Any status</option>
        {EVENT_TYPES.map((t) => (
          <option key={t} value={t}>{EVENT_LABELS[t]}</option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm">Filter</Button>
    </form>
  );
}
