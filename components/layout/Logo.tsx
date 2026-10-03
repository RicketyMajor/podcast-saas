"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";

// Five bars drawn as a wave; they ripple only while something is playing.
const BARS = [
  { x: 1, h: 8, delay: "-0.2s" },
  { x: 6, h: 16, delay: "-0.6s" },
  { x: 11, h: 22, delay: "0s" },
  { x: 16, h: 14, delay: "-0.4s" },
  { x: 21, h: 6, delay: "-0.8s" },
];

export function Logo() {
  const playing = usePlayerStore((s) => s.isPlaying);
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-md font-display text-[1.375rem] font-extrabold tracking-[-0.04em] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <svg
        aria-hidden
        viewBox="0 0 25 24"
        className="size-6 text-ambient transition-colors duration-700"
      >
        {BARS.map((bar) => (
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
      Waves
    </Link>
  );
}
