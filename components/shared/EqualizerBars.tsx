import { cn } from "@/lib/utils";

// Resting heights and phase offsets; the `eq` keyframes live in globals.css.
const BARS = [
  { h: "60%", delay: "0s" },
  { h: "100%", delay: "-0.45s" },
  { h: "40%", delay: "-0.8s" },
  { h: "80%", delay: "-0.25s" },
];

/** The "now playing" signal. Frozen mid-pose when paused; static with reduced motion. */
export function EqualizerBars({
  playing,
  className,
}: {
  playing: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex h-3.5 items-end gap-[2px]", className)}
    >
      {BARS.map((bar, i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom rounded-full bg-current motion-safe:animate-[eq_0.9s_ease-in-out_infinite]"
          style={{
            height: bar.h,
            animationDelay: bar.delay,
            animationPlayState: playing ? "running" : "paused",
          }}
        />
      ))}
    </span>
  );
}
