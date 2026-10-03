"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { Loader2, Mic, Radio } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PillButton } from "@/components/shared/PillButton";
import { api } from "@/convex/_generated/api";
import { EMPTY_STATES } from "@/lib/constants";

import { HomeHero, HomeHeroSkeleton } from "./HomeHero";
import { PodcastGrid } from "./PodcastGrid";
import { PodcastShelf } from "./PodcastShelf";

const PAGE_SIZE = 8;

// Also the default /discover view, with its own titles (screens.md §2.5).
export function HomeFeed({
  trendingTitle = "Tendencias",
  latestTitle = "Recientes",
  trendingLimit = PAGE_SIZE,
  featured = false,
}: {
  trendingTitle?: string;
  latestTitle?: string;
  trendingLimit?: number;
  /** Home: #1 trending as the hero, the rest as a shelf. */
  featured?: boolean;
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
          <PillButton asChild>
            <Link href="/create-podcast">
              <Mic aria-hidden />
              Crear podcast
            </Link>
          </PillButton>
        }
      />
    );
  }

  return (
    <>
      {featured ? (
        <>
          {trending === undefined ? (
            <HomeHeroSkeleton />
          ) : (
            trending[0] && <HomeHero podcast={trending[0]} />
          )}
          {trending?.length !== 1 && (
            <PodcastShelf title={trendingTitle} podcasts={trending?.slice(1)} />
          )}
        </>
      ) : (
        <section className="flex flex-col gap-5">
          <SectionHeader title={trendingTitle} />
          <PodcastGrid podcasts={trending} skeletons={trendingLimit} />
        </section>
      )}
      <section className="flex flex-col gap-5">
        <SectionHeader title={latestTitle} />
        <PodcastGrid
          podcasts={
            latest.status === "LoadingFirstPage" ? undefined : latest.results
          }
        />
        {(latest.status === "CanLoadMore" ||
          latest.status === "LoadingMore") && (
          <PillButton
            tone="glass"
            className="self-center"
            disabled={latest.status === "LoadingMore"}
            onClick={() => latest.loadMore(PAGE_SIZE)}
          >
            {latest.status === "LoadingMore" && (
              <Loader2 aria-hidden className="animate-spin" />
            )}
            Cargar más
          </PillButton>
        )}
      </section>
    </>
  );
}
