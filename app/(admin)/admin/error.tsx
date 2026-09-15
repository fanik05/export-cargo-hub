"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-card p-6">
      <h1 className="text-[20px] font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.digest ? `Reference: ${error.digest}` : error.message}</p>
      <Button onClick={reset} variant="outline" className="h-9 rounded-md px-4 text-sm">Try again</Button>
    </div>
  );
}
