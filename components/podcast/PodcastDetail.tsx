"use client";

import { useQuery } from "convex/react";
import { Home, Radio, SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { PodcastDetailHeader } from "./PodcastDetailHeader";
import { PodcastGrid } from "./PodcastGrid";
import { TranscriptView } from "./TranscriptView";

export function PodcastDetail({ podcastId }: { podcastId: string }) {
  const podcast = useQuery(api.podcasts.getById, { podcastId });
  const me = useQuery(api.users.current);

  if (podcast === undefined) return <DetailSkeleton />;
  if (podcast === null) return <PodcastNotFound />;

  return (
    <div className="flex flex-col gap-10">
      <PodcastDetailHeader
        podcast={podcast}
        isOwner={me?._id === podcast.authorId}
      />
      <p className="max-w-prose text-lg text-pretty text-muted-foreground">
        {podcast.description}
      </p>
      <TranscriptView transcript={podcast.transcript} />
      {podcast.imageSource === "ai" && podcast.imagePrompt && (
        <details className="group max-w-prose text-sm text-muted-foreground">
          <summary className="cursor-pointer rounded-sm font-medium hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
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
        <Button asChild>
          <Link href="/">
            <Home aria-hidden />
            Volver al inicio
          </Link>
        </Button>
      }
    />
  );
}

function DetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 sm:flex-row sm:items-end"
      aria-busy="true"
      aria-label="Cargando podcast"
    >
      <Skeleton className="aspect-square w-full max-w-62.5 self-center rounded-2xl sm:self-auto" />
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
    </div>
  );
}
