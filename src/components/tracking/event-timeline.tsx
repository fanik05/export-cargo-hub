import type { PublicEvent } from "@/lib/tracking/public";
import { EVENT_LABELS } from "@/lib/tracking/status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EventTimeline({ events }: { events: PublicEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No milestones have been recorded yet.</p>;
  }
  return (
    <ol className="relative ml-1.25 border-l-2 border-border pl-6">
      {events.map((e, i) => (
        <li key={`${e.type}-${e.occurredAt}-${i}`} className="relative pb-6 last:pb-0">
          <span
            aria-hidden
            className={cn(
              "absolute top-1.5 -left-7.5 size-2.5 rounded-full ring-4 ring-card",
              i === 0 ? "bg-amber" : "bg-border",
              e.type === "EXCEPTION" && "bg-destructive",
            )}
          />
          <p className={cn("text-sm", i === 0 ? "font-semibold" : "font-medium")}>
            {EVENT_LABELS[e.type]}
            {e.location && <span className="font-normal text-muted-foreground"> {e.location}</span>}
          </p>
          <p className="text-[13px] text-muted-foreground">{formatDateTime(e.occurredAt)}</p>
          {e.note && <p className="mt-1 text-sm">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
