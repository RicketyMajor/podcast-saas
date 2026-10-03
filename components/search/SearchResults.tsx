"use client";

import { useQuery } from "convex/react";
import { Mic, SearchX, X } from "lucide-react";
import Link from "next/link";

import { PodcastGrid } from "@/components/podcast/PodcastGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PillButton } from "@/components/shared/PillButton";
import { api } from "@/convex/_generated/api";
import { formatCount } from "@/lib/utils";

export function SearchResults({ term }: { term: string }) {
  const results = useQuery(api.podcasts.search, { query: term });

  if (results?.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={`No encontramos podcasts para «${term}»`}
        description="Prueba con otras palabras o busca por el nombre del creador."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
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
          </div>
        }
      />
    );
  }

  return (
    <section className="flex flex-col gap-5">
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
      <PodcastGrid podcasts={results} />
    </section>
  );
}
