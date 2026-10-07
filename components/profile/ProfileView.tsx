"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  Home,
  ListMusic,
  Loader2,
  Mic,
  Plus,
  Radio,
  Undo2,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PodcastGrid } from "@/components/podcast/PodcastGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PillButton } from "@/components/shared/PillButton";
import { Shelf } from "@/components/shared/Shelf";
import { ShowCard } from "@/components/show/ShowCard";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/utils";

import { ProfileHeader, type ProfileData } from "./ProfileHeader";

export function ProfileView({ profileId }: { profileId: string }) {
  const profile = useQuery(api.users.getById, { profileId });
  // A profile you blocked shows nothing of theirs: don't even ask.
  const visible = profile && !profile.blockedByMe ? profile : null;
  const podcasts = useQuery(
    api.podcasts.getByAuthor,
    visible ? { authorId: visible._id } : "skip",
  );
  const shows = useQuery(
    api.shows.getByAuthor,
    visible ? { authorId: visible._id } : "skip",
  );
  const me = useQuery(api.users.current);

  // undefined until the session user loads, so neither the owner's buttons
  // nor "Seguir" flash on the wrong profile.
  const isOwner =
    me === undefined ? undefined : !!profile && me?._id === profile._id;
  // Visitors only see shows with something to play; the owner sees all of
  // theirs (it's their "my shows" list).
  const listed = useMemo(
    () => shows?.filter((show) => isOwner || show.episodeCount > 0),
    [shows, isOwner],
  );

  if (profile === undefined) return <ProfileSkeleton />;
  if (profile === null) return <ProfileNotFound />;
  if (profile.blockedByMe) return <BlockedProfile profile={profile} />;

  // Who is looking and what there is pick the layout: wait for both
  // instead of flashing the wrong empty state.
  const ready =
    me !== undefined && listed !== undefined && podcasts !== undefined;

  return (
    <div className="flex flex-col gap-10">
      <ProfileHeader profile={profile} podcasts={podcasts} isOwner={isOwner} />
      {!ready ? (
        <PodcastGrid
          podcasts={undefined}
          skeletons={Math.min(profile.podcastCount, 8) || 4}
        />
      ) : isOwner && listed.length === 0 ? (
        // No show yet means no episode either: one step, one action.
        <EmptyState
          icon={ListMusic}
          title="Todavía no tienes shows"
          description="Un show agrupa tus episodios con su portada y su categoría. Crea el tuyo y publica el primero."
          action={
            <PillButton asChild>
              <Link href="/shows/new">
                <Plus aria-hidden />
                Crear mi primer show
              </Link>
            </PillButton>
          }
        />
      ) : listed.length === 0 && podcasts.length === 0 ? (
        <EmptyState
          icon={Radio}
          title={`${profile.name} aún no ha publicado podcasts`}
        />
      ) : (
        <>
          {listed.length > 0 && (
            <Shelf
              title={`Shows de ${profile.name}`}
              items={listed}
              renderItem={(show) => <ShowCard show={show} />}
            />
          )}
          <section className="flex flex-col gap-5">
            <SectionHeader title="Episodios recientes" />
            {podcasts.length > 0 ? (
              <PodcastGrid podcasts={podcasts} />
            ) : isOwner ? (
              <EmptyState
                icon={Mic}
                title="Todavía no has publicado episodios"
                description="Escribe un guion, elige una voz y la IA hace el resto."
                action={
                  <PillButton asChild>
                    <Link href="/create-podcast">
                      <Mic aria-hidden />
                      Crear mi primer episodio
                    </Link>
                  </PillButton>
                }
              />
            ) : (
              <EmptyState
                icon={Radio}
                title={`${profile.name} aún no ha publicado episodios`}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** A profile you blocked: who it is, and the way back. Nothing else. */
function BlockedProfile({ profile }: { profile: ProfileData }) {
  const unblock = useMutation(api.users.unblock);
  const [pending, setPending] = useState(false);

  async function handleUnblock() {
    setPending(true);
    try {
      await unblock({ userId: profile._id });
      toast.success(`Desbloqueaste a ${profile.name}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <EmptyState
      as="h1"
      icon={Ban}
      title={`Bloqueaste a ${profile.name}`}
      description="Ninguno ve el contenido del otro y no pueden seguirse."
      action={
        <PillButton tone="glass" disabled={pending} onClick={handleUnblock}>
          {pending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <Undo2 aria-hidden />
          )}
          Desbloquear
        </PillButton>
      }
    />
  );
}

function ProfileNotFound() {
  return (
    <EmptyState
      as="h1"
      icon={UserX}
      title="Este perfil no existe"
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

function ProfileSkeleton() {
  return (
    <div
      className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-8"
      role="status"
      aria-busy="true"
      aria-label="Cargando perfil"
    >
      <Skeleton className="size-36 rounded-full sm:size-44 lg:size-52" />
      <div className="flex flex-col items-center gap-4 sm:items-start">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-12 w-52 rounded-full" />
      </div>
    </div>
  );
}
