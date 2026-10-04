import type { Metadata } from "next";
import { CreatePodcast } from "@/components/create/CreatePodcast";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { TITLE_MAX_CHARS } from "@/convex/lib/limits";

export const metadata: Metadata = { title: "Crear podcast" };

export default async function CreatePodcastPage({
  searchParams,
}: PageProps<"/create-podcast">) {
  // `?title=` comes from the empty search state (phase 11); `?show=` from a
  // show page or a freshly created show (phase 17).
  const { title, show } = await searchParams;
  const defaultTitle =
    typeof title === "string" ? title.trim().slice(0, TITLE_MAX_CHARS) : "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SectionHeader as="h1" title="Crear podcast" />
      <CreatePodcast
        defaultTitle={defaultTitle}
        defaultShowId={typeof show === "string" ? show : undefined}
      />
    </div>
  );
}
