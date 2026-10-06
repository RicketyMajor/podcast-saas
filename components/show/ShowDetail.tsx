"use client";

import { usePreloadedQuery, useQuery, type Preloaded } from "convex/react";
import { Home, Mic, Radio, SearchX } from "lucide-react";
import Link from "next/link";

import { PodcastGrid } from "@/components/podcast/PodcastGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { PillButton } from "@/components/shared/PillButton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { api } from "@/convex/_generated/api";

import { DirectoryPanel } from "./DirectoryPanel";
import { ShowHeader } from "./ShowHeader";

export function ShowDetail({
  preloadedShow,
}: {
  /** Loaded on the server, so the header ships in the HTML. */
  preloadedShow: Preloaded<typeof api.shows.getById>;
}) {
  const show = usePreloadedQuery(preloadedShow);
  const me = useQuery(api.users.current);
  const episodes = useQuery(
    api.podcasts.getByShow,
    show ? { showId: show._id } : "skip",
  );

  if (show === null) return <ShowNotFound />;
  const isOwner = me?._id === show.authorId;

  return (
    <div className="flex flex-col gap-10">
      <ShowHeader
        show={show}
        latest={episodes && (episodes[0] ?? null)}
        isOwner={isOwner}
      />
      <p className="max-w-prose text-lg text-pretty text-foreground/80">
        {show.description}
      </p>
      {isOwner && show.episodeCount > 0 && <DirectoryPanel showId={show._id} />}
      <section className="flex flex-col gap-5">
        <SectionHeader title="Episodios" />
        {episodes?.length === 0 ? (
          isOwner ? (
            // The header's "Nuevo episodio" is the one ivory action here.
            <EmptyState
              icon={Mic}
              title="Publica el primer episodio"
              description="Usa «Nuevo episodio»: escribe un guion, elige una voz y la IA hace el resto."
            />
          ) : (
            <EmptyState icon={Radio} title="Este show aún no tiene episodios" />
          )
        ) : (
          <PodcastGrid
            podcasts={episodes}
            skeletons={Math.min(show.episodeCount, 8) || 4}
          />
        )}
      </section>
    </div>
  );
}

export function ShowNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Este show no existe o fue eliminado"
      action={
        <PillButton asChild>
          <Link href="/">
            <Home aria-hidden />
            Volver al inicio
          </Link>
        </PillButton>
      }
    />
  );
}
