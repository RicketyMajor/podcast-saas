"use client";

import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Radio } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { api } from "@/convex/_generated/api";
import { cn, formatCountOf } from "@/lib/utils";

export type ShowCardData = FunctionReturnType<
  typeof api.shows.getPopular
>[number];

const SHEET =
  "absolute rounded-2xl ring-1 ring-foreground/8 transition-transform duration-300 ease-out-expo motion-reduce:transition-none";

// PodcastCard's anatomy without play: a show is opened, not played. Two
// sheets peek above the cover, so it reads as a stack of episodes; the
// stack lifts with the cover on hover and the back sheet fans out a little.
export function ShowCard({
  show,
  className,
}: {
  show: ShowCardData;
  className?: string;
}) {
  const convex = useConvex();
  // The show page ships its header from the server; warm its episode list.
  const prewarm = () =>
    convex.prewarmQuery({
      query: api.podcasts.getByShow,
      args: { showId: show._id },
    });

  return (
    <div
      className={cn("group relative flex min-w-0 flex-col gap-3", className)}
    >
      <div className="relative aspect-square transition-transform duration-300 ease-out-expo group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <div
          aria-hidden
          className={cn(
            SHEET,
            "inset-x-6 -top-2.5 h-8 bg-foreground/8 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0",
          )}
        />
        <div
          aria-hidden
          className={cn(SHEET, "inset-x-3 -top-1.25 h-8 bg-foreground/16")}
        />
        <div className="absolute inset-0 overflow-hidden rounded-2xl bg-muted ring-1 shadow-black/50 ring-foreground/8 transition-shadow duration-300 ease-out-expo group-hover:shadow-xl">
          {show.imageUrl ? (
            <Image
              src={show.imageUrl}
              alt=""
              fill
              // Always a shelf item: w-40, sm:w-48 (Shelf).
              sizes="(min-width: 640px) 192px, 160px"
              className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.05] motion-reduce:transition-none"
            />
          ) : (
            <Radio
              aria-hidden
              className="absolute inset-0 m-auto size-10 text-muted-foreground"
            />
          )}
          <span className="absolute top-2 left-2 rounded-full bg-background/65 px-2 py-0.5 text-xs font-medium tabular-nums backdrop-blur-md">
            {formatCountOf(show.episodeCount, "episodio", "episodios")}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          href={`/shows/${show._id}`}
          onPointerEnter={prewarm}
          onFocus={prewarm}
          className="line-clamp-2 font-semibold text-pretty outline-none group-hover:underline after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
        >
          {show.title}
        </Link>
        <p className="truncate text-sm text-muted-foreground">
          {show.authorName}
        </p>
      </div>
    </div>
  );
}
