"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import Link from "next/link";

import { PodcastForm } from "@/components/create/PodcastForm";
import { PodcastNotFound } from "@/components/podcast/PodcastDetail";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PillButton } from "@/components/shared/PillButton";
import { api } from "@/convex/_generated/api";

export function EditPodcast({ podcastId }: { podcastId: string }) {
  const podcast = useQuery(api.podcasts.getById, { podcastId });
  const me = useQuery(api.users.current);

  let content;
  if (podcast === undefined || me === undefined) {
    content = (
      <Loader2
        aria-label="Cargando podcast"
        className="mx-auto size-8 animate-spin text-muted-foreground"
      />
    );
  } else if (podcast === null) {
    content = <PodcastNotFound />;
  } else if (me?._id !== podcast.authorId) {
    content = (
      <EmptyState
        icon={Lock}
        title="No puedes editar este podcast"
        description="Solo su autor puede modificarlo."
        action={
          <PillButton asChild tone="glass">
            <Link href={`/podcasts/${podcast._id}`}>
              <ArrowLeft aria-hidden />
              Ver el podcast
            </Link>
          </PillButton>
        }
      />
    );
  } else {
    content = <PodcastForm podcast={podcast} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SectionHeader as="h1" title="Editar podcast" />
      {content}
    </div>
  );
}
