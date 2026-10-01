import { PodcastDetail } from "@/components/podcast/PodcastDetail";

export default async function PodcastDetailPage({
  params,
}: PageProps<"/podcasts/[podcastId]">) {
  const { podcastId } = await params;
  return <PodcastDetail podcastId={podcastId} />;
}
