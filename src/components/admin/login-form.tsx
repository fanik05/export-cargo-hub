"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { INITIAL_ACTION_STATE } from "@/lib/validation/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/admin/form-field";
import { PasswordInput } from "@/components/admin/password-input";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, INITIAL_ACTION_STATE);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <Field id="email" label="Email" errors={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className={controlClass}
          aria-invalid={!!errors.email}
          required
        />
      </Field>
      <Field id="password" label="Password" errors={errors.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          className={controlClass}
          aria-invalid={!!errors.password}
          required
        />
      </Field>
      {!state.ok && state.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending} className="h-10 w-full rounded-md text-sm">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
