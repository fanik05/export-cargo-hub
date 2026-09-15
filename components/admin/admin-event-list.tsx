import type { ActionResult } from "@/lib/validation/form";
import type { ShipmentEvent } from "@/lib/generated/prisma/client";
import { EVENT_LABELS } from "@/lib/tracking/status";
import { formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { cn } from "@/lib/utils";

type Props = {
  events: ShipmentEvent[]; // newest first
  deleteAction: (eventId: string) => (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function AdminEventList({ events, deleteAction }: Props) {
  if (events.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No events yet. Add the first milestone to start the timeline.
      </p>
    );
  }
  return (
    <ol className="relative ml-1.25 border-l-2 border-border pl-6">
      {events.map((e, i) => (
        <li key={e.id} className="relative pb-6 last:pb-0">
          <span
            aria-hidden
            className={cn(
              "absolute top-1.5 -left-7.5 size-2.5 rounded-full ring-4 ring-card",
              i === 0 ? "bg-amber" : "bg-border",
              e.type === "EXCEPTION" && "bg-destructive",
            )}
          />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {EVENT_LABELS[e.type]}
                {e.location && <span className="font-normal text-muted-foreground"> {e.location}</span>}
              </p>
              <p className="text-[13px] text-muted-foreground">{formatDateTime(e.occurredAt)}</p>
              {e.note && <p className="mt-1 text-sm">{e.note}</p>}
            </div>
            <ActionForm action={deleteAction(e.id)} successMessage="Event deleted">
              <SubmitButton
                variant="ghost"
                size="sm"
                pendingText="Deleting…"
                className="h-8 shrink-0 rounded-md px-3 text-sm text-muted-foreground hover:text-destructive"
              >
                Delete
              </SubmitButton>
            </ActionForm>
          </div>
        </li>
      ))}
    </ol>
  );
}
