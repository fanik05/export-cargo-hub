import type { EventType } from "@/lib/generated/prisma/client";
import { EVENT_LABELS, STATUS_TONE, type StatusTone } from "@/lib/tracking/status";
import { cn } from "@/lib/utils";

const toneClass: Record<StatusTone, string> = {
  neutral: "bg-muted text-foreground",
  info: "bg-transit-soft text-transit",
  success: "bg-success-soft text-success-strong",
  warning: "bg-amber-soft text-warning-strong",
};

export function StatusBadge({ status, className }: { status: EventType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap",
        toneClass[STATUS_TONE[status]],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      {EVENT_LABELS[status]}
    </span>
  );
}
