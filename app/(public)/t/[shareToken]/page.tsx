import type { Metadata } from "next";
import { findPublicShipmentByToken } from "@/lib/tracking/queries";
import { TrackingView } from "@/components/tracking/tracking-view";
import { TrackSearch } from "@/components/tracking/track-search";

export const metadata: Metadata = { title: "Shipment tracking", robots: { index: false } };

export default async function SharePage(props: PageProps<"/t/[shareToken]">) {
  const { shareToken } = await props.params;
  const shipment = await findPublicShipmentByToken(shareToken);

  if (!shipment) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
        <div className="rounded-md border border-border bg-card p-6">
          <h1 className="text-[20px] font-semibold">This link is no longer valid</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The share link may have been regenerated. Ask the sender for a new one, or track by number.
          </p>
          <TrackSearch className="mt-5" autoFocus />
        </div>
      </div>
    );
  }
  return <TrackingView shipment={shipment} />;
}
