import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { controlClass } from "@/components/admin/form-field";
import { EVENT_LABELS, EVENT_TYPES } from "@/lib/tracking/status";
import { cn } from "@/lib/utils";

export function SearchForm({ q, status }: { q: string; status: string }) {
  const active = Boolean(q || status);
  return (
    <form method="get" action="/admin" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        name="q"
        defaultValue={q}
        placeholder="Tracking number, shipper, consignee, AWB or B/L"
        className={cn(controlClass, "w-full md:w-80")}
        aria-label="Search shipments"
      />
      <select
        name="status"
        defaultValue={status}
        aria-label="Status"
        className={cn(controlClass, "w-full sm:w-48")}
      >
        <option value="">Any status</option>
        {EVENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {EVENT_LABELS[t]}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" className="h-9 rounded-md px-4 text-sm">
          Filter
        </Button>
        {active && (
          <Link
            href="/admin"
            className="rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
