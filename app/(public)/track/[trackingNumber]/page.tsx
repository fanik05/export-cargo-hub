import type { Metadata } from "next";
import { findPublicShipmentByTrackingNumber } from "@/lib/tracking/queries";
import { normalizeTrackingNumber, safeDecode } from "@/lib/tracking/status";
import { TrackingView } from "@/components/tracking/tracking-view";
import { TrackSearch } from "@/components/tracking/track-search";

export async function generateMetadata(props: PageProps<"/track/[trackingNumber]">): Promise<Metadata> {
  const { trackingNumber } = await props.params;
  return { title: `${normalizeTrackingNumber(safeDecode(trackingNumber))} · Export Cargo Hub` };
}

export default async function TrackPage(props: PageProps<"/track/[trackingNumber]">) {
  const { trackingNumber } = await props.params;
  const input = safeDecode(trackingNumber);
  const shipment = await findPublicShipmentByTrackingNumber(input);

  if (!shipment) {
    return (
      <div className="flex w-full max-w-lg flex-col items-center gap-6 pt-10 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">No shipment found</h1>
          <p className="text-sm text-muted-foreground">
            Nothing matches <span className="font-mono">{normalizeTrackingNumber(input)}</span>. Check the number and try again.
          </p>
        </div>
        <TrackSearch defaultValue={normalizeTrackingNumber(input)} />
      </div>
    );
  }
  return <TrackingView shipment={shipment} />;
}
