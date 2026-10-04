"use client";

import { useQuery } from "convex/react";
import { Mic, SearchX, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PodcastGrid } from "@/components/podcast/PodcastGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { PillButton } from "@/components/shared/PillButton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Shelf } from "@/components/shared/Shelf";
import { ShowCard } from "@/components/show/ShowCard";
import { api } from "@/convex/_generated/api";
import { cn, formatCountOf } from "@/lib/utils";

export function SearchResults({ term }: { term: string }) {
  const shows = useQuery(api.shows.search, { query: term });
  const episodes = useQuery(api.podcasts.search, { query: term });
  // Both or nothing, so the sections never land one keystroke apart. The
  // term travels with them: stale results keep the words they answered.
  const results = useMemo(
    () => (shows && episodes ? { term, shows, episodes } : undefined),
    [term, shows, episodes],
  );
  // While a new term loads, keep the previous results on screen (dimmed)
  // instead of flashing skeletons on every keystroke; when the new ones
  // arrive, cards that stay glide to their slot and new ones rise in.
  const [last, setLast] = useState(results);
  if (results !== undefined && results !== last) setLast(results);
  const shown = results ?? last;
  const stale = results === undefined && last !== undefined;

  const dim = cn(
    "transition-[opacity,filter] duration-300 ease-out-expo",
    stale && "opacity-50 saturate-50",
  );

  if (shown?.shows.length === 0 && shown.episodes.length === 0) {
    return (
      <div aria-busy={stale} className={dim}>
        <EmptyState
          icon={SearchX}
          title={`No encontramos shows ni episodios para «${shown.term}»`}
          description="Prueba con otras palabras o busca por el nombre del creador."
          action={
            <>
              <PillButton asChild tone="glass">
                <Link href="/discover">
                  <X aria-hidden />
                  Limpiar búsqueda
                </Link>
              </PillButton>
              <PillButton asChild>
                <Link
                  href={`/create-podcast?title=${encodeURIComponent(shown.term)}`}
                >
                  <Mic aria-hidden />
                  Crear un podcast sobre esto
                </Link>
              </PillButton>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div aria-busy={stale} className={cn("flex flex-col gap-10", dim)}>
      <p aria-live="polite" className="sr-only">
        {results &&
          `${formatCountOf(results.shows.length, "show", "shows")} y ${formatCountOf(results.episodes.length, "episodio", "episodios")} para «${results.term}»`}
      </p>
      {/* No skeleton row: most terms match no show. */}
      {shown && shown.shows.length > 0 && (
        <Shelf
          title="Shows"
          items={shown.shows}
          renderItem={(show) => <ShowCard show={show} />}
        />
      )}
      {shown?.episodes.length !== 0 && (
        <section className="flex flex-col gap-5">
          <SectionHeader
            title="Episodios"
            action={
              shown && (
                <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {formatCountOf(
                    shown.episodes.length,
                    "episodio",
                    "episodios",
                  )}
                </p>
              )
            }
          />
          <PodcastGrid podcasts={shown?.episodes} />
        </section>
      )}
    </div>
  );
}
