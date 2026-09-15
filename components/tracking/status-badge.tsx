import type { EventType } from "@/lib/generated/prisma/client";
import { EVENT_LABELS, STATUS_TONE, type StatusTone } from "@/lib/tracking/status";
import { cn } from "@/lib/utils";

const toneClass: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-foreground",
  info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

export function StatusBadge({ status, className }: { status: EventType; className?: string }) {
  return (
    <span className={cn("inline-flex items-center border px-2 py-0.5 text-xs font-medium whitespace-nowrap", toneClass[STATUS_TONE[status]], className)}>
      {EVENT_LABELS[status]}
    </span>
  );
}
