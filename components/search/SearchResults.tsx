"use client";

import { useQuery } from "convex/react";
import { Mic, SearchX, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PodcastGrid } from "@/components/podcast/PodcastGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { PillButton } from "@/components/shared/PillButton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { api } from "@/convex/_generated/api";
import { cn, formatCount } from "@/lib/utils";

export function SearchResults({ term }: { term: string }) {
  const results = useQuery(api.podcasts.search, { query: term });
  // While a new term loads, keep the previous results on screen (dimmed)
  // instead of flashing skeletons on every keystroke; when the new ones
  // arrive, cards that stay glide to their slot and new ones rise in.
  const [last, setLast] = useState(results);
  if (results !== undefined && results !== last) setLast(results);
  const shown = results ?? last;
  const stale = results === undefined && last !== undefined;

  if (results?.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={`No encontramos podcasts para «${term}»`}
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
    <section className="flex flex-col gap-5" aria-busy={stale}>
      <SectionHeader
        title={`Resultados para «${term}»`}
        action={
          results && (
            <p
              aria-live="polite"
              className="shrink-0 text-sm text-muted-foreground tabular-nums"
            >
              {formatCount(results.length)}{" "}
              {results.length === 1 ? "podcast" : "podcasts"}
            </p>
          )
        }
      />
      <div
        className={cn(
          "transition-[opacity,filter] duration-300 ease-out-expo",
          stale && "opacity-50 saturate-50",
        )}
      >
        <PodcastGrid podcasts={shown} />
      </div>
    </section>
  );
}
