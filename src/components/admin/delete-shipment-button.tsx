"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/admin/submit-button";

export function DeleteShipmentButton({ action, trackingNumber }: { action: () => Promise<void>; trackingNumber: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" className="h-9 rounded-md px-3.5 text-sm" />}>
        Delete shipment
      </DialogTrigger>
      <DialogContent className="rounded-md">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">Delete {trackingNumber}?</DialogTitle>
          <DialogDescription className="text-sm">
            This removes the shipment and all its events. The public tracking link stops working.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="h-9 rounded-md px-3.5 text-sm" />}>Cancel</DialogClose>
          <form action={action}>
            <SubmitButton variant="destructive" pendingText="Deleting…" className="h-9 rounded-md px-3.5 text-sm">
              Delete shipment
            </SubmitButton>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
