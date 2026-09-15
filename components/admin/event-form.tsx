"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { INITIAL_ACTION_STATE, type ActionResult } from "@/lib/validation/form";
import { EVENT_LABELS, EVENT_TYPES } from "@/lib/tracking/status";
import { toDateTimeInputValue } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/admin/field-error";
import { SubmitButton } from "@/components/admin/submit-button";

export function EventForm({ action }: { action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => {
    if (state.ok) {
      toast.success("Event added");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">Event</Label>
        <select id="type" name="type" className="h-8 border border-input bg-background px-2 text-xs" defaultValue="IN_TRANSIT">
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{EVENT_LABELS[t]}</option>
          ))}
        </select>
        <FieldError errors={errors.type} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="occurredAt">When (UTC)</Label>
        <Input id="occurredAt" name="occurredAt" type="datetime-local" defaultValue={toDateTimeInputValue(new Date())} required />
        <FieldError errors={errors.occurredAt} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="DAC" />
        <FieldError errors={errors.location} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Public note</Label>
        <Input id="note" name="note" placeholder="Required for exceptions" />
        <FieldError errors={errors.note} />
      </div>
      <div className="md:col-span-4">
        <SubmitButton size="sm" pendingText="Adding…">Add event</SubmitButton>
      </div>
    </form>
  );
}
