"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/admin/submit-button";

export function DeleteShipmentButton({ action, trackingNumber }: { action: () => Promise<void>; trackingNumber: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>Delete shipment</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {trackingNumber}?</DialogTitle>
          <DialogDescription>This removes the shipment and all its events. The public tracking link stops working.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm" />}>Cancel</DialogClose>
          <form action={action}>
            <SubmitButton variant="destructive" size="sm" pendingText="Deleting…">Delete</SubmitButton>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
