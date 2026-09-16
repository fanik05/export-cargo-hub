"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { INITIAL_ACTION_STATE, type ActionResult } from "@/lib/validation/form";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  successMessage?: string;
  className?: string;
  children: React.ReactNode;
};

export function ActionForm({ action, successMessage, className, children }: Props) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  useEffect(() => {
    if (state.ok && successMessage) toast.success(successMessage);
    if (!state.ok && state.message) toast.error(state.message);
  }, [state, successMessage]);
  return <form action={formAction} className={className}>{children}</form>;
}
