"use client";

import { useState } from "react";
import type { ActionResult } from "@/lib/validation/form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EventForm } from "@/components/admin/event-form";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function EventDrawer({ action }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button className="h-9 rounded-md px-4 text-sm" />}>Add event</SheetTrigger>
      <SheetContent
        side="right"
        className="overflow-y-auto bg-card text-sm data-[side=right]:w-full data-[side=right]:sm:max-w-[420px]"
      >
        <SheetHeader className="border-b border-border p-5 pr-14">
          <SheetTitle className="text-[16px] font-semibold text-foreground">Add event</SheetTitle>
          <SheetDescription className="text-[13px] text-muted-foreground">
            Adds a milestone to the timeline and updates the shipment&rsquo;s status.
          </SheetDescription>
        </SheetHeader>
        <div className="p-5">
          <EventForm action={action} onSuccess={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
