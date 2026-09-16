"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createUserAction } from "@/actions/users";
import { INITIAL_ACTION_STATE } from "@/lib/validation/form";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/admin/form-field";
import { SubmitButton } from "@/components/admin/submit-button";

export function UserForm() {
  const [state, formAction] = useActionState(createUserAction, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => {
    if (state.ok) {
      toast.success("Admin added");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <section className="rounded-md border border-border bg-card">
      <h2 className="border-b border-border px-5 py-4 text-[16px] font-semibold">Add an admin</h2>
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <Field id="name" label="Name" errors={errors.name}>
          <Input id="name" name="name" className={controlClass} required />
        </Field>
        <Field id="email" label="Email" errors={errors.email}>
          <Input id="email" name="email" type="email" className={controlClass} required />
        </Field>
        <Field id="password" label="Password" hint="At least 8 characters." errors={errors.password}>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            className={controlClass}
            required
          />
        </Field>
        <div className="flex items-end md:col-span-2">
          <SubmitButton pendingText="Adding…" className="h-9 rounded-md px-4 text-sm">
            Add admin
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}
