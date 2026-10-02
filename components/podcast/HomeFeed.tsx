"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { Loader2, Mic, Radio } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { EMPTY_STATES } from "@/lib/constants";

import { PodcastGrid } from "./PodcastGrid";

const PAGE_SIZE = 8;

// Also the default /discover view, with its own titles (screens.md §2.5).
export function HomeFeed({
  trendingTitle = "Tendencias",
  latestTitle = "Recientes",
  trendingLimit = PAGE_SIZE,
}: {
  trendingTitle?: string;
  latestTitle?: string;
  trendingLimit?: number;
}) {
  const trending = useQuery(api.podcasts.getTrending, {
    limit: trendingLimit,
  });
  const latest = usePaginatedQuery(
    api.podcasts.getLatest,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  if (trending?.length === 0) {
    return (
      <EmptyState
        icon={Radio}
        title={EMPTY_STATES.noPodcasts.title}
        description={EMPTY_STATES.noPodcasts.description}
        action={
          <Button asChild>
            <Link href="/create-podcast">
              <Mic aria-hidden />
              Crear podcast
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <section className="flex flex-col gap-5">
        <SectionHeader title={trendingTitle} />
        <PodcastGrid podcasts={trending} skeletons={trendingLimit} />
      </section>
      <section className="flex flex-col gap-5">
        <SectionHeader title={latestTitle} />
        <PodcastGrid
          podcasts={
            latest.status === "LoadingFirstPage" ? undefined : latest.results
          }
        />
        {(latest.status === "CanLoadMore" ||
          latest.status === "LoadingMore") && (
          <Button
            variant="outline"
            className="h-10 self-center"
            disabled={latest.status === "LoadingMore"}
            onClick={() => latest.loadMore(PAGE_SIZE)}
          >
            {latest.status === "LoadingMore" && (
              <Loader2 aria-hidden className="animate-spin" />
            )}
            Cargar más
          </Button>
        )}
      </section>
    </>
  );
}
