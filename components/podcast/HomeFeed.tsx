"use client";

import {
  usePaginatedQuery,
  usePreloadedQuery,
  type Preloaded,
} from "convex/react";
import { Loader2, Mic, Radio } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PillButton } from "@/components/shared/PillButton";
import { Shelf } from "@/components/shared/Shelf";
import { ShowCard } from "@/components/show/ShowCard";
import { api } from "@/convex/_generated/api";
import { EMPTY_STATES } from "@/lib/constants";

import { HomeHero } from "./HomeHero";
import { PodcastCard } from "./PodcastCard";
import { PodcastGrid } from "./PodcastGrid";

const PAGE_SIZE = 8;

// Also the default /discover view, with its own titles (screens.md §2.5).
export function HomeFeed({
  preloadedTrending,
  preloadedShows,
  preloadedFollowing,
  trendingTitle = "Tendencias",
  latestTitle = "Recientes",
  featured = false,
}: {
  /** Loaded on the server, so the hero (the LCP) ships in the HTML. */
  preloadedTrending: Preloaded<typeof api.podcasts.getTrending>;
  /** Also from the server, so an empty row never flashes in and out. */
  preloadedShows: Preloaded<typeof api.shows.getPopular>;
  /** Home only, from the server with the session: episodes from people you follow. */
  preloadedFollowing?: Preloaded<typeof api.podcasts.getFromFollowing>;
  trendingTitle?: string;
  latestTitle?: string;
  /** Home: #1 trending as the hero, the rest as a shelf. */
  featured?: boolean;
}) {
  const trending = usePreloadedQuery(preloadedTrending);
  const shows = usePreloadedQuery(preloadedShows);
  const latest = usePaginatedQuery(
    api.podcasts.getLatest,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  if (trending.length === 0) {
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
      {featured && trending[0] && <HomeHero podcast={trending[0]} />}
      {/* Home: the hero takes #1, so the shelf starts at #2. */}
      {!(featured && trending.length === 1) && (
        <Shelf
          title={trendingTitle}
          items={featured ? trending.slice(1) : trending}
          renderItem={(podcast) => <PodcastCard podcast={podcast} />}
        />
      )}
      {preloadedFollowing && <FollowingShelf preloaded={preloadedFollowing} />}
      {shows.length > 0 && (
        <Shelf
          title="Shows populares"
          items={shows}
          renderItem={(show) => <ShowCard show={show} />}
        />
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

/** Hidden when empty: signed out, following nobody, or they haven't published. */
function FollowingShelf({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.podcasts.getFromFollowing>;
}) {
  const podcasts = usePreloadedQuery(preloaded);
  if (podcasts.length === 0) return null;
  return (
    <Shelf
      title="De quienes sigues"
      items={podcasts}
      renderItem={(podcast) => <PodcastCard podcast={podcast} />}
    />
  );
}
