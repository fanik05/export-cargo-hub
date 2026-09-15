"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeTrackingNumber } from "@/lib/tracking/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TrackSearch({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  return (
    <form
      className="flex w-full max-w-lg gap-2"
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
        className="h-10 font-mono text-sm"
        autoFocus
      />
      <Button type="submit" size="lg">Track</Button>
    </form>
  );
}
