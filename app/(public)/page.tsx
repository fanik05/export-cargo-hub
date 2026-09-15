import { TrackSearch } from "@/components/tracking/track-search";

export default function HomePage() {
  return (
    <section className="bg-navy text-white">
      <div className="mx-auto w-full max-w-3xl px-4 pb-12 sm:px-6">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Track a shipment</h1>
        <p className="mt-1 text-sm text-white/70">
          Enter the tracking number from your booking confirmation.
        </p>
        <TrackSearch className="mt-6" autoFocus />
      </div>
    </section>
  );
}
