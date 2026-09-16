import type { Metadata } from "next";
import { findPublicShipmentByTrackingNumber } from "@/lib/tracking/queries";
import { normalizeTrackingNumber, safeDecode } from "@/lib/tracking/status";
import { TrackingView } from "@/components/tracking/tracking-view";
import { TrackSearch } from "@/components/tracking/track-search";

export async function generateMetadata(props: PageProps<"/track/[trackingNumber]">): Promise<Metadata> {
  const { trackingNumber } = await props.params;
  return {
    title: `Tracking ${normalizeTrackingNumber(safeDecode(trackingNumber))}`,
    robots: { index: false },
  };
}

export default async function TrackPage(props: PageProps<"/track/[trackingNumber]">) {
  const { trackingNumber } = await props.params;
  const input = safeDecode(trackingNumber);
  const shipment = await findPublicShipmentByTrackingNumber(input);

  if (!shipment) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg rounded-md border border-border bg-card p-6">
          <h1 className="text-[20px] font-semibold">No shipment found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing matches <span className="font-mono">{normalizeTrackingNumber(input)}</span>. Check the
            number and try again.
          </p>
          <TrackSearch defaultValue={normalizeTrackingNumber(input)} className="mt-5" autoFocus />
        </div>
      </div>
    );
  }
  return <TrackingView shipment={shipment} />;
}
