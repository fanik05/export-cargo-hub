"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeTrackingNumber } from "@/lib/tracking/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  defaultValue?: string;
  /** Slimmer version for the band on tracking pages. */
  compact?: boolean;
  autoFocus?: boolean;
  className?: string;
};

export function TrackSearch({ defaultValue = "", compact = false, autoFocus = false, className }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const height = compact ? "h-9" : "h-11";

  return (
    <form
      className={cn("flex w-full gap-2", compact ? "max-w-sm" : "max-w-lg", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const n = normalizeTrackingNumber(value);
        if (n) router.push(`/track/${encodeURIComponent(n)}`);
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ECH-2026-00042"
        aria-label="Tracking number"
        className={cn(
          height,
          "rounded-md border-input bg-white px-3 font-mono text-sm text-foreground md:text-sm",
        )}
        autoFocus={autoFocus}
      />
      <Button
        type="submit"
        className={cn(height, "shrink-0 rounded-md bg-amber px-5 text-sm text-[#111827] hover:bg-[#D97706]")}
      >
        Track
      </Button>
    </form>
  );
}
