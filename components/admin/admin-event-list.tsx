import type { ActionResult } from "@/lib/validation/form";
import type { ShipmentEvent } from "@/lib/generated/prisma/client";
import { EVENT_LABELS } from "@/lib/tracking/status";
import { formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";

type Props = {
  events: ShipmentEvent[];  // newest first
  deleteAction: (eventId: string) => (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function AdminEventList({ events, deleteAction }: Props) {
  return (
    <ul className="divide-y divide-border border border-border">
      {events.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-4 p-3 text-sm">
          <div>
            <div className="font-medium">{EVENT_LABELS[e.type]}{e.location ? ` · ${e.location}` : ""}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(e.occurredAt)}</div>
            {e.note && <div className="mt-1 text-xs">{e.note}</div>}
          </div>
          <ActionForm action={deleteAction(e.id)} successMessage="Event deleted">
            <SubmitButton variant="ghost" size="xs" pendingText="…">Delete</SubmitButton>
          </ActionForm>
        </li>
      ))}
    </ul>
  );
}
