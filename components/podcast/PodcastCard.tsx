import { AudioLines } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";
import { formatDuration } from "@/lib/utils";

export type PodcastCardData = FunctionReturnType<
  typeof api.podcasts.getTrending
>[number];

// ponytail: the ▶ quick-play button lands with the global player (phase 8).
export function PodcastCard({ podcast }: { podcast: PodcastCardData }) {
  return (
    <Link
      href={`/podcasts/${podcast._id}`}
      className="group flex min-w-0 flex-col gap-3 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
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
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="line-clamp-2 font-semibold text-pretty group-hover:underline">
          {podcast.title}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {podcast.authorName}
        </p>
      </div>
    </Link>
  );
}
