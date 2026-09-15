import { TrackSearch } from "@/components/tracking/track-search";

export default function HomePage() {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6 pt-16 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Track your shipment</h1>
        <p className="text-sm text-muted-foreground">Enter the tracking number from your booking confirmation.</p>
      </div>
      <TrackSearch />
    </div>
  );
}
