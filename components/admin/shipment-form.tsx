"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { INITIAL_ACTION_STATE, type ActionResult } from "@/lib/validation/form";
import { toDateInputValue } from "@/lib/format";
import type { Shipment } from "@/lib/generated/prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/admin/field-error";
import { SubmitButton } from "@/components/admin/submit-button";

/** A Shipment with Decimal weightKg already stringified, so it can cross to the client. */
export type FormShipment = Omit<Shipment, "weightKg"> & { weightKg: string | null };

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  shipment?: FormShipment;
  submitLabel: string;
};

function Field({ id, label, errors, children }: { id: string; label: string; errors?: string[]; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldError errors={errors} />
    </div>
  );
}

export function ShipmentForm({ action, shipment, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => {
    if (state.ok) toast.success("Shipment saved");
  }, [state]);

  return (
    <form action={formAction} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <Field id="mode" label="Mode" errors={errors.mode}>
        <select id="mode" name="mode" defaultValue={shipment?.mode ?? "AIR"} className="h-8 border border-input bg-background px-2 text-xs">
          <option value="AIR">Air</option>
          <option value="OCEAN">Ocean</option>
        </select>
      </Field>
      <div className="hidden md:block" />
      <Field id="shipperName" label="Shipper" errors={errors.shipperName}>
        <Input id="shipperName" name="shipperName" defaultValue={shipment?.shipperName} required />
      </Field>
      <Field id="consigneeName" label="Consignee" errors={errors.consigneeName}>
        <Input id="consigneeName" name="consigneeName" defaultValue={shipment?.consigneeName} required />
      </Field>
      <Field id="originPort" label="Origin" errors={errors.originPort}>
        <Input id="originPort" name="originPort" defaultValue={shipment?.originPort} placeholder="DAC – Dhaka" required />
      </Field>
      <Field id="destinationPort" label="Destination" errors={errors.destinationPort}>
        <Input id="destinationPort" name="destinationPort" defaultValue={shipment?.destinationPort} placeholder="FRA – Frankfurt" required />
      </Field>
      <Field id="carrier" label="Carrier" errors={errors.carrier}>
        <Input id="carrier" name="carrier" defaultValue={shipment?.carrier ?? ""} />
      </Field>
      <Field id="masterRef" label="AWB / B/L number" errors={errors.masterRef}>
        <Input id="masterRef" name="masterRef" defaultValue={shipment?.masterRef ?? ""} />
      </Field>
      <Field id="etd" label="ETD" errors={errors.etd}>
        <Input id="etd" name="etd" type="date" defaultValue={toDateInputValue(shipment?.etd ?? null)} />
      </Field>
      <Field id="eta" label="ETA" errors={errors.eta}>
        <Input id="eta" name="eta" type="date" defaultValue={toDateInputValue(shipment?.eta ?? null)} />
      </Field>
      <Field id="pieces" label="Pieces" errors={errors.pieces}>
        <Input id="pieces" name="pieces" type="number" min={0} step={1} defaultValue={shipment?.pieces ?? ""} />
      </Field>
      <Field id="weightKg" label="Weight (kg)" errors={errors.weightKg}>
        <Input id="weightKg" name="weightKg" type="number" min={0} step="0.01" defaultValue={shipment?.weightKg ?? ""} />
      </Field>
      <div className="md:col-span-2">
        <Field id="notes" label="Internal notes (never shown publicly)" errors={errors.notes}>
          <Textarea id="notes" name="notes" defaultValue={shipment?.notes ?? ""} rows={3} />
        </Field>
      </div>
      {!state.ok && state.message && <p className="text-sm text-destructive md:col-span-2">{state.message}</p>}
      <div className="md:col-span-2">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
