"use client";

import { usePreloadedQuery, useQuery, type Preloaded } from "convex/react";
import { ChevronRight, Home, Radio, SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PillButton } from "@/components/shared/PillButton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { PodcastDetailHeader } from "./PodcastDetailHeader";
import { PodcastGrid } from "./PodcastGrid";
import { TranscriptView } from "./TranscriptView";

export function PodcastDetail({
  preloadedPodcast,
}: {
  /** Loaded on the server, so the header (the LCP) ships in the HTML. */
  preloadedPodcast: Preloaded<typeof api.podcasts.getById>;
}) {
  const podcast = usePreloadedQuery(preloadedPodcast);
  const me = useQuery(api.users.current);

  if (podcast === null) return <PodcastNotFound />;

  return (
    <div className="flex flex-col gap-10">
      <PodcastDetailHeader
        podcast={podcast}
        isOwner={me?._id === podcast.authorId}
      />
      <p className="max-w-prose text-lg text-pretty text-foreground/80">
        {podcast.description}
      </p>
      <TranscriptView transcript={podcast.transcript} hosts={podcast.hosts} />
      {podcast.imageSource === "ai" && podcast.imagePrompt && (
        <details className="group max-w-prose text-sm text-muted-foreground">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-sm font-medium hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden
              className="size-4 transition-transform duration-300 ease-out-expo group-open:rotate-90"
            />
            Prompt de la portada
          </summary>
          <p className="mt-2 text-pretty">{podcast.imagePrompt}</p>
        </details>
      )}
      <SimilarPodcasts podcastId={podcast._id} />
    </div>
  );
}

function SimilarPodcasts({ podcastId }: { podcastId: Id<"podcasts"> }) {
  const similar = useQuery(api.podcasts.getSimilar, { podcastId });
  return (
    <section className="flex flex-col gap-5">
      <SectionHeader title="Podcasts similares" />
      {similar?.length === 0 ? (
        <EmptyState icon={Radio} title="Todavía no hay podcasts similares" />
      ) : (
        <PodcastGrid podcasts={similar} skeletons={4} />
      )}
    </section>
  );
}

export function PodcastNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Este podcast no existe o fue eliminado"
      action={
        <PillButton asChild>
          <Link href="/">
            <Home aria-hidden />
            Volver al inicio
          </Link>
        </PillButton>
      }
    />
  );
}
