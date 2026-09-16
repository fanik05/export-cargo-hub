"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-[420px] flex-col items-start gap-3 rounded-md border border-border bg-card p-6">
        <h1 className="text-[20px] font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">Please try again. If it keeps happening, contact the operator.</p>
        <Button onClick={reset} variant="outline" className="h-9 rounded-md px-4 text-sm">Try again</Button>
      </div>
    </main>
  );
}
