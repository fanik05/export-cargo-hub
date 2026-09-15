"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 rounded-md px-3.5 text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success(`${label} copied`);
        } catch {
          toast.error("Your browser blocked clipboard access. Copy the value by hand.");
        }
      }}
    >
      Copy {label.toLowerCase()}
    </Button>
  );
}
