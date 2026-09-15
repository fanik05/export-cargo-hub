"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { INITIAL_ACTION_STATE } from "@/lib/validation/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, INITIAL_ACTION_STATE);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />
        {errors.email && <p className="text-xs text-destructive">{errors.email[0]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!errors.password} />
        {errors.password && <p className="text-xs text-destructive">{errors.password[0]}</p>}
      </div>
      {!state.ok && state.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
