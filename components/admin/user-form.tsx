"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createUserAction } from "@/actions/users";
import { INITIAL_ACTION_STATE } from "@/lib/validation/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/admin/field-error";
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
    <form ref={formRef} action={formAction} className="grid max-w-2xl grid-cols-1 gap-3 md:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
        <FieldError errors={errors.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError errors={errors.email} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        <FieldError errors={errors.password} />
      </div>
      <div className="md:col-span-3">
        <SubmitButton size="sm" pendingText="Adding…">Add admin</SubmitButton>
      </div>
    </form>
  );
}
