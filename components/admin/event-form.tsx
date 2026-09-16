"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { INITIAL_ACTION_STATE, type ActionResult } from "@/lib/validation/form";
import { EVENT_LABELS, EVENT_TYPES } from "@/lib/tracking/status";
import { toDateTimeInputValue } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/admin/form-field";
import { SubmitButton } from "@/components/admin/submit-button";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  /** Called after the event is saved — lets the drawer close itself. */
  onSuccess?: () => void;
};

export function EventForm({ action, onSuccess }: Props) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const fillNow = () => {
    const el = formRef.current?.elements.namedItem("occurredAt");
    if (el instanceof HTMLInputElement) el.value = toDateTimeInputValue(new Date());
  };

  useEffect(() => {
    fillNow();
  }, []);

  useEffect(() => {
    if (state.ok) {
      toast.success("Event added");
      formRef.current?.reset();
      fillNow();
      onSuccessRef.current?.();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <Field id="type" label="Event" errors={errors.type}>
        <select id="type" name="type" className={controlClass} defaultValue="IN_TRANSIT">
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EVENT_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field id="occurredAt" label="When (UTC)" errors={errors.occurredAt}>
        <Input
          id="occurredAt"
          name="occurredAt"
          type="datetime-local"
          defaultValue=""
          className={controlClass}
          required
        />
      </Field>
      <Field id="location" label="Location" errors={errors.location}>
        <Input id="location" name="location" placeholder="DAC" className={controlClass} />
      </Field>
      <Field id="note" label="Public note" hint="Required for exceptions." errors={errors.note}>
        <Input id="note" name="note" className={controlClass} />
      </Field>
      <SubmitButton pendingText="Adding…" className="h-9 w-full rounded-md text-sm">
        Add event
      </SubmitButton>
    </form>
  );
}
