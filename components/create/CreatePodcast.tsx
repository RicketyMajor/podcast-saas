"use client";

import { useQuery } from "convex/react";
import { Loader2, Plus, Radio } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { PillButton } from "@/components/shared/PillButton";
import { api } from "@/convex/_generated/api";

import { PodcastForm } from "./PodcastForm";

/** Loads the author's shows first: an episode can't be created without one. */
export function CreatePodcast({
  defaultTitle,
  defaultShowId,
}: {
  defaultTitle?: string;
  defaultShowId?: string;
}) {
  const me = useQuery(api.users.current);
  const shows = useQuery(
    api.shows.getByAuthor,
    me ? { authorId: me._id } : "skip",
  );

  // The proxy only lets signed-in users here; null is an expired session.
  if (me === null) {
    return (
      <EmptyState
        icon={Radio}
        title="Inicia sesión para crear"
        action={
          <PillButton asChild>
            <Link href="/sign-in?redirectTo=/create-podcast">
              Iniciar sesión
            </Link>
          </PillButton>
        }
      />
    );
  }
  if (shows === undefined) {
    return (
      <Loader2
        aria-label="Cargando tus shows"
        className="mx-auto size-8 animate-spin text-muted-foreground"
      />
    );
  }
  if (shows.length === 0) {
    return (
      <EmptyState
        icon={Radio}
        title="Primero crea tu show"
        description="Cada episodio vive en un show, con su portada, categoría e idioma. Créalo una vez y publica todos los episodios que quieras."
        action={
          <PillButton asChild>
            <Link href="/shows/new?next=create">
              <Plus aria-hidden />
              Crear mi show
            </Link>
          </PillButton>
        }
      />
    );
  }
  return (
    <PodcastForm
      shows={shows}
      defaultTitle={defaultTitle}
      defaultShowId={defaultShowId}
    />
  );
}
