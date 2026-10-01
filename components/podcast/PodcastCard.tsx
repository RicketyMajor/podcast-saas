import type { FunctionReturnType } from "convex/server";
import { AudioLines } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { api } from "@/convex/_generated/api";
import { formatDuration } from "@/lib/utils";

import { CardPlayButton } from "./CardPlayButton";

export type PodcastCardData = FunctionReturnType<
  typeof api.podcasts.getTrending
>[number];

// The title link stretches over the whole card (after:inset-0); the play
// button sits above it, since a <button> can't live inside an <a>.
export function PodcastCard({ podcast }: { podcast: PodcastCardData }) {
  return (
    <div className="group relative flex min-w-0 flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
        {podcast.imageUrl ? (
          <Image
            src={podcast.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1536px) 20vw, (min-width: 768px) 30vw, 50vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <AudioLines
            aria-hidden
            className="absolute inset-0 m-auto size-10 text-muted-foreground"
          />
        )}
        <span className="absolute right-2 bottom-2 rounded-md bg-background/80 px-1.5 py-0.5 text-xs font-medium tabular-nums">
          {formatDuration(podcast.audioDurationSec)}
        </span>
        {podcast.audioUrl && (
          <CardPlayButton
            className="absolute bottom-2 left-2 z-10"
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
          className="line-clamp-2 font-semibold text-pretty outline-none group-hover:underline after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
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
