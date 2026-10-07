import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { cache } from "react";

import { ShowDetail } from "@/components/show/ShowDetail";
import { api } from "@/convex/_generated/api";
import { feedPath } from "@/lib/feed/rss";

// One Convex call per request, shared by the metadata and the page.
const preloadShow = cache((showId: string) =>
  preloadQuery(api.shows.getById, { showId }),
);

export async function generateMetadata({
  params,
}: PageProps<"/shows/[showId]">): Promise<Metadata> {
  const { showId } = await params;
  const show = preloadedQueryResult(await preloadShow(showId));
  if (!show) return { title: "Show no encontrado" };

  const description = show.description.slice(0, 160);
  const images = show.imageUrl
    ? [{ url: show.imageUrl, alt: show.title }]
    : undefined;
  return {
    title: show.title,
    description,
    openGraph: {
      type: "website",
      siteName: "Waves",
      title: show.title,
      description,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: show.title,
      description,
      images,
    },
    // Feed autodiscovery, only when there is a feed (episodes).
    alternates:
      show.episodeCount > 0
        ? {
            types: {
              "application/rss+xml": [
                { url: feedPath(show._id), title: show.title },
              ],
            },
          }
        : undefined,
  };
}

export default async function ShowPage({
  params,
}: PageProps<"/shows/[showId]">) {
  const { showId } = await params;
  return <ShowDetail preloadedShow={await preloadShow(showId)} />;
}
