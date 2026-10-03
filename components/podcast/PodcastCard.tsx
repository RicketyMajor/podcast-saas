"use client";

import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { AudioLines } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { EqualizerBars } from "@/components/shared/EqualizerBars";
import { api } from "@/convex/_generated/api";
import { cn, formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";

import { CardPlayButton } from "./CardPlayButton";

export type PodcastCardData = FunctionReturnType<
  typeof api.podcasts.getTrending
>[number];

export const coverTransitionName = (id: string) => `cover-${id}`;

/**
 * Names a cover just before navigating to its detail page, so it morphs into
 * the detail header. Only on click: the same podcast can sit in two lists on
 * one page, and duplicate view-transition names abort the whole transition.
 */
export function nameCoverForMorph(el: HTMLElement | null, id: string) {
  if (!el) return;
  el.style.viewTransitionName = coverTransitionName(id);
  el.style.setProperty("view-transition-class", "cover");
}

// The title link stretches over the whole card (after:inset-0); the play
// button sits above it, since a <button> can't live inside an <a>.
export function PodcastCard({
  podcast,
  className,
}: {
  podcast: PodcastCardData;
  className?: string;
}) {
  const convex = useConvex();
  const coverRef = useRef<HTMLDivElement>(null);
  const isCurrent = usePlayerStore((s) => s.track?.podcastId === podcast._id);
  const playing = usePlayerStore(
    (s) => s.isPlaying && s.track?.podcastId === podcast._id,
  );

  // Warm the detail query so the page renders in the navigation commit and
  // the cover can morph into the detail header.
  const prewarm = () =>
    convex.prewarmQuery({
      query: api.podcasts.getById,
      args: { podcastId: podcast._id },
    });

  const nameCover = () => nameCoverForMorph(coverRef.current, podcast._id);

  return (
    <div
      className={cn("group relative flex min-w-0 flex-col gap-3", className)}
    >
      {/* The lifting cover becomes a stacking context on hover, so the play
          button lives beside it (z-10 over the stretched title link), not
          inside it. */}
      <div className="relative aspect-square">
        <div
          ref={coverRef}
          className="absolute inset-0 overflow-hidden rounded-2xl bg-muted ring-1 shadow-black/50 ring-foreground/8 transition-[translate,box-shadow] duration-300 ease-out-expo group-hover:-translate-y-1 group-hover:shadow-xl motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
        >
          {podcast.imageUrl ? (
            <Image
              src={podcast.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1536px) 20vw, (min-width: 768px) 30vw, 50vw"
              className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.05] motion-reduce:transition-none"
            />
          ) : (
            <AudioLines
              aria-hidden
              className="absolute inset-0 m-auto size-10 text-muted-foreground"
            />
          )}
          <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-background/65 px-2 py-0.5 text-xs font-medium tabular-nums backdrop-blur-md">
            {isCurrent && (
              <EqualizerBars playing={playing} className="h-2.5 text-ambient" />
            )}
            {formatDuration(podcast.audioDurationSec)}
          </span>
        </div>
        {podcast.audioUrl && (
          <CardPlayButton
            className="absolute right-2 bottom-2 z-10 group-hover:-translate-y-1"
            track={{
              podcastId: podcast._id,
              title: podcast.title,
              authorId: podcast.authorId,
              authorName: podcast.authorName,
              imageUrl: podcast.imageUrl,
              audioUrl: podcast.audioUrl,
              durationSec: podcast.audioDurationSec,
            }}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          href={`/podcasts/${podcast._id}`}
          onPointerEnter={prewarm}
          onFocus={prewarm}
          onClick={nameCover}
          className={cn(
            "line-clamp-2 font-semibold text-pretty outline-none group-hover:underline after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50",
            isCurrent && "text-ambient",
          )}
        >
          {podcast.title}
        </Link>
        <p className="truncate text-sm text-muted-foreground">
          {podcast.authorName}
        </p>
      </div>
    </div>
  );
}
