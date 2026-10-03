"use client";

import { useQuery } from "convex/react";
import Image from "next/image";

import { WaveMark } from "@/components/layout/Logo";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { usePageCover } from "@/stores/ambient-store";

const COLUMNS = 3;
const MIN_COVERS = 6; // fewer and the wall repeats itself: show the wave
const COLUMN_MIN_ITEMS = 6;

/**
 * Real published covers drifting in slow columns behind the auth pitch.
 * Each column is rendered twice and scrolls by half its height, so it loops
 * seamlessly; the drift stops under reduced motion.
 */
export function CoverWall() {
  const covers = useQuery(api.podcasts.getTrending, { limit: 12 })
    ?.map((p) => p.imageUrl)
    .filter((url): url is string => url !== null);
  usePageCover(covers?.[0]);

  if (covers === undefined) return null;
  if (covers.length < MIN_COVERS) {
    return (
      <div aria-hidden className="absolute inset-0 grid place-items-center">
        <WaveMark className="h-40 w-42 opacity-80" />
      </div>
    );
  }

  // One copy of a column must outgrow the panel, so short columns repeat.
  const columns = Array.from({ length: COLUMNS }, (_, c) => {
    const own = covers.filter((_, i) => i % COLUMNS === c);
    return Array.from(
      { length: Math.max(COLUMN_MIN_ITEMS, own.length) },
      (_, i) => own[i % own.length]!,
    );
  });
  return (
    <div
      aria-hidden
      className="absolute inset-0 grid -rotate-6 grid-cols-3 gap-4 overflow-hidden px-6 opacity-70 mask-y-from-60% mask-y-to-100% [scale:1.25]"
    >
      {columns.map((column, c) => (
        <div
          key={c}
          className={cn(
            // pb = gap, so half the height is exactly one copy (seamless).
            "flex flex-col gap-4 pb-4 motion-safe:animate-[wall-drift_80s_linear_infinite]",
            c === 1 && "[animation-delay:-40s] [animation-direction:reverse]",
          )}
        >
          {[...column, ...column].map((url, i) => (
            <div
              key={i}
              className="relative aspect-square shrink-0 overflow-hidden rounded-2xl shadow-2xl ring-1 shadow-black/60 ring-foreground/10"
            >
              <Image src={url} alt="" fill sizes="200px" className="object-cover" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
