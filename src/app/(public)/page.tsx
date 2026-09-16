import { TrackSearch } from "@/components/tracking/track-search";
import { cn } from "@/lib/utils";

/** The same milestones the timeline shows, so the page previews what tracking gives you. */
const MILESTONES = ["Booked", "In transit", "Arrived", "Delivered"];

export default function HomePage() {
  return (
    <section className="flex flex-1 flex-col justify-center bg-navy text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[40px]">
          Track a shipment
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
          Enter the tracking number from your booking confirmation, or open the share link your
          forwarder sent you. No account needed.
        </p>

        <TrackSearch className="mt-7" autoFocus />
        <p className="mt-3 text-[13px] text-white/50">
          Tracking numbers look like <span className="font-mono text-white/70">ECH-2026-00042</span>
        </p>

        <div className="mt-14 border-t border-white/15 pt-5">
          <ol className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {MILESTONES.map((label, i) => (
              <li key={label} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    i === 0 ? "bg-amber" : "bg-white/25",
                  )}
                />
                <span className="text-[13px] text-white/60">{label}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px] text-white/50">
            Every milestone shows the date, time and location it was recorded.
          </p>
        </div>
      </div>
    </section>
  );
}
