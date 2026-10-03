import type { Metadata } from "next";
import { EditPodcast } from "@/components/create/EditPodcast";

export const metadata: Metadata = { title: "Editar podcast" };

export default async function EditPodcastPage({
  params,
}: PageProps<"/podcasts/[podcastId]/edit">) {
  const { podcastId } = await params;
  return <EditPodcast podcastId={podcastId} />;
}
