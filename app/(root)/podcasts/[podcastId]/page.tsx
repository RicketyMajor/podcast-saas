import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { cache } from "react";

import { PodcastDetail } from "@/components/podcast/PodcastDetail";
import { api } from "@/convex/_generated/api";

// One Convex call per request, shared by the metadata and the page.
const preloadPodcast = cache((podcastId: string) =>
  preloadQuery(api.podcasts.getById, { podcastId }),
);

export async function generateMetadata({
  params,
}: PageProps<"/podcasts/[podcastId]">): Promise<Metadata> {
  const { podcastId } = await params;
  const podcast = preloadedQueryResult(await preloadPodcast(podcastId));
  if (!podcast) return { title: "Podcast no encontrado" };

  const description = podcast.description.slice(0, 160);
  const images = podcast.imageUrl
    ? [{ url: podcast.imageUrl, alt: podcast.title }]
    : undefined;
  return {
    title: podcast.title,
    description,
    openGraph: {
      type: "music.song",
      title: podcast.title,
      description,
      images,
      audio: podcast.audioUrl ?? undefined,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: podcast.title,
      description,
      images,
    },
  };
}

export default async function PodcastDetailPage({
  params,
}: PageProps<"/podcasts/[podcastId]">) {
  const { podcastId } = await params;
  return <PodcastDetail preloadedPodcast={await preloadPodcast(podcastId)} />;
}
