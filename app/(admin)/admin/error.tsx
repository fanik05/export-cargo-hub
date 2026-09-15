"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.digest ? `Reference: ${error.digest}` : error.message}</p>
      <Button onClick={reset} variant="outline" size="sm">Try again</Button>
    </div>
  );
}
