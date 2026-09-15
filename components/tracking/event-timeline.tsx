import type { PublicEvent } from "@/lib/tracking/public";
import { EVENT_LABELS } from "@/lib/tracking/status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EventTimeline({ events }: { events: PublicEvent[] }) {
  return (
    <ol className="relative flex flex-col gap-0 border-l border-border pl-5">
      {events.map((e, i) => (
        <li key={`${e.type}-${e.occurredAt}-${i}`} className="relative pb-6 last:pb-0">
          <span
            aria-hidden
            className={cn(
              "absolute -left-[25px] top-1 size-2.5 border bg-background",
              i === 0 ? "border-foreground bg-foreground" : "border-border",
              e.type === "EXCEPTION" && "border-amber-500 bg-amber-500",
            )}
          />
          <div className={cn("text-sm", i === 0 ? "font-semibold" : "font-medium")}>
            {EVENT_LABELS[e.type]}
            {e.location && <span className="font-normal text-muted-foreground"> · {e.location}</span>}
          </div>
          <div className="text-xs text-muted-foreground">{formatDateTime(e.occurredAt)}</div>
          {e.note && <p className="mt-1 text-sm">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
