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
import { cn, formatCount } from "@/lib/utils";

const plural = (n: number, one: string, many: string) =>
  `${formatCount(n)} ${n === 1 ? one : many}`;

export function SearchResults({ term }: { term: string }) {
  const shows = useQuery(api.shows.search, { query: term });
  const episodes = useQuery(api.podcasts.search, { query: term });
  // Both or nothing, so the sections never land one keystroke apart.
  const results = useMemo(
    () => (shows && episodes ? { shows, episodes } : undefined),
    [shows, episodes],
  );
  // While a new term loads, keep the previous results on screen (dimmed)
  // instead of flashing skeletons on every keystroke; when the new ones
  // arrive, cards that stay glide to their slot and new ones rise in.
  const [last, setLast] = useState(results);
  if (results !== undefined && results !== last) setLast(results);
  const shown = results ?? last;
  const stale = results === undefined && last !== undefined;

  if (results?.shows.length === 0 && results.episodes.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={`No encontramos shows ni episodios para «${term}»`}
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
              <Link href={`/create-podcast?title=${encodeURIComponent(term)}`}>
                <Mic aria-hidden />
                Crear un podcast sobre esto
              </Link>
            </PillButton>
          </>
        }
      />
    );
  }

  return (
    <div
      aria-busy={stale}
      className={cn(
        "flex flex-col gap-10 transition-[opacity,filter] duration-300 ease-out-expo",
        stale && "opacity-50 saturate-50",
      )}
    >
      <p aria-live="polite" className="sr-only">
        {results &&
          `${plural(results.shows.length, "show", "shows")} y ${plural(results.episodes.length, "episodio", "episodios")} para «${term}»`}
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
                  {plural(shown.episodes.length, "episodio", "episodios")}
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
