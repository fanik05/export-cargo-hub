import type { Metadata } from "next";
import { findPublicShipmentByToken } from "@/lib/tracking/queries";
import { TrackingView } from "@/components/tracking/tracking-view";
import { TrackSearch } from "@/components/tracking/track-search";

export const metadata: Metadata = { title: "Shipment · Export Cargo Hub", robots: { index: false } };

export default async function SharePage(props: PageProps<"/t/[shareToken]">) {
  const { shareToken } = await props.params;
  const shipment = await findPublicShipmentByToken(shareToken);

  if (!shipment) {
    return (
      <div className="flex w-full max-w-lg flex-col items-center gap-6 pt-10 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">This link is no longer valid</h1>
          <p className="text-sm text-muted-foreground">The share link may have been regenerated. Ask the sender for a new one, or track by number.</p>
        </div>
        <TrackSearch />
      </div>
    );
  }
  return <TrackingView shipment={shipment} />;
}
