"use client";

import Link from "next/link";

import { WAVE_BARS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";

/** The wave mark alone, at any size (`className` sets it). */
export function WaveMark({ className }: { className?: string }) {
  const playing = usePlayerStore((s) => s.isPlaying);
  return (
    <svg
      aria-hidden
      viewBox="0 0 25 24"
      className={cn("text-ambient transition-colors duration-700", className)}
    >
      {WAVE_BARS.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={(24 - bar.h) / 2}
          width="3"
          height={bar.h}
          rx="1.5"
          fill="currentColor"
          // At rest the full wave shows; it ripples only while playing.
          className={cn(
            "origin-center [transform-box:fill-box]",
            playing && "motion-safe:animate-[eq_1.1s_ease-in-out_infinite]",
          )}
          style={{ animationDelay: bar.delay }}
        />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-md font-display text-[1.375rem] font-extrabold tracking-[-0.04em] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <WaveMark className="size-6" />
      Waves
    </Link>
  );
}
