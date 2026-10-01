import { EditPodcast } from "@/components/create/EditPodcast";

export default async function EditPodcastPage({
  params,
}: PageProps<"/podcasts/[podcastId]/edit">) {
  const { podcastId } = await params;
  return <EditPodcast podcastId={podcastId} />;
}
