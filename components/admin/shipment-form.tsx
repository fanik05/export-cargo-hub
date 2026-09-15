"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { INITIAL_ACTION_STATE, type ActionResult } from "@/lib/validation/form";
import { toDateInputValue } from "@/lib/format";
import type { Shipment } from "@/lib/generated/prisma/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, controlClass } from "@/components/admin/form-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { cn } from "@/lib/utils";

/** A Shipment with Decimal weightKg already stringified, so it can cross to the client. */
export type FormShipment = Omit<Shipment, "weightKg"> & { weightKg: string | null };

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  shipment?: FormShipment;
  submitLabel: string;
  successMessage?: string;
};

export function ShipmentForm({ action, shipment, submitLabel, successMessage = "Changes saved" }: Props) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => {
    if (state.ok) toast.success(successMessage);
  }, [state, successMessage]);

  return (
    <section className="rounded-md border border-border bg-card">
      <h2 className="border-b border-border px-5 py-4 text-[16px] font-semibold">Shipment details</h2>
      <form action={formAction} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <Field id="mode" label="Mode" errors={errors.mode}>
          <select id="mode" name="mode" defaultValue={shipment?.mode ?? "AIR"} className={controlClass}>
            <option value="AIR">Air</option>
            <option value="OCEAN">Ocean</option>
          </select>
        </Field>
        <div className="hidden md:block" />
        <Field id="shipperName" label="Shipper" errors={errors.shipperName}>
          <Input id="shipperName" name="shipperName" defaultValue={shipment?.shipperName} className={controlClass} required />
        </Field>
        <Field id="consigneeName" label="Consignee" errors={errors.consigneeName}>
          <Input id="consigneeName" name="consigneeName" defaultValue={shipment?.consigneeName} className={controlClass} required />
        </Field>
        <Field id="originPort" label="Origin" errors={errors.originPort}>
          <Input id="originPort" name="originPort" defaultValue={shipment?.originPort} placeholder="DAC – Dhaka" className={controlClass} required />
        </Field>
        <Field id="destinationPort" label="Destination" errors={errors.destinationPort}>
          <Input id="destinationPort" name="destinationPort" defaultValue={shipment?.destinationPort} placeholder="FRA – Frankfurt" className={controlClass} required />
        </Field>
        <Field id="carrier" label="Carrier" errors={errors.carrier}>
          <Input id="carrier" name="carrier" defaultValue={shipment?.carrier ?? ""} className={controlClass} />
        </Field>
        <Field id="masterRef" label="AWB or B/L number" errors={errors.masterRef}>
          <Input id="masterRef" name="masterRef" defaultValue={shipment?.masterRef ?? ""} className={cn(controlClass, "font-mono")} />
        </Field>
        <Field id="etd" label="ETD" errors={errors.etd}>
          <Input id="etd" name="etd" type="date" defaultValue={toDateInputValue(shipment?.etd ?? null)} className={controlClass} />
        </Field>
        <Field id="eta" label="ETA" errors={errors.eta}>
          <Input id="eta" name="eta" type="date" defaultValue={toDateInputValue(shipment?.eta ?? null)} className={controlClass} />
        </Field>
        <Field id="pieces" label="Pieces" errors={errors.pieces}>
          <Input id="pieces" name="pieces" type="number" min={0} max={2_147_483_647} step={1} defaultValue={shipment?.pieces ?? ""} className={controlClass} />
        </Field>
        <Field id="weightKg" label="Weight (kg)" errors={errors.weightKg}>
          <Input id="weightKg" name="weightKg" type="number" min={0} max={99_999_999.99} step="0.01" defaultValue={shipment?.weightKg ?? ""} className={controlClass} />
        </Field>
        <Field
          id="notes"
          label="Internal notes"
          hint="Only admins see this."
          errors={errors.notes}
          className="md:col-span-2"
        >
          <Textarea
            id="notes"
            name="notes"
            defaultValue={shipment?.notes ?? ""}
            rows={3}
            className="min-h-20 rounded-md border-input bg-card px-3 py-2 text-sm md:text-sm"
          />
        </Field>
        {!state.ok && state.message && <p className="text-sm text-destructive md:col-span-2">{state.message}</p>}
        <div className="md:col-span-2">
          <SubmitButton pendingText="Saving…" className="h-9 rounded-md px-4 text-sm">
            {submitLabel}
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}
