"use client";

import { useQuery } from "convex/react";
import { Home, Mic, Radio, UserX } from "lucide-react";
import Link from "next/link";

import { PodcastGrid } from "@/components/podcast/PodcastGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PillButton } from "@/components/shared/PillButton";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

import { ProfileHeader } from "./ProfileHeader";

export function ProfileView({ profileId }: { profileId: string }) {
  const profile = useQuery(api.users.getById, { profileId });
  const podcasts = useQuery(
    api.podcasts.getByAuthor,
    profile ? { authorId: profile._id } : "skip",
  );
  const me = useQuery(api.users.current);

  if (profile === undefined) return <ProfileSkeleton />;
  if (profile === null) return <ProfileNotFound />;

  const isOwner = me?._id === profile._id;

  return (
    <div className="flex flex-col gap-10">
      <ProfileHeader profile={profile} podcasts={podcasts} isOwner={isOwner} />
      <section className="flex flex-col gap-5">
        <SectionHeader title={`Podcasts de ${profile.name}`} />
        {podcasts?.length === 0 ? (
          isOwner ? (
            <EmptyState
              icon={Mic}
              title="Todavía no has creado podcasts"
              description="Escribe un guion, elige una voz y la IA hace el resto."
              action={
                <PillButton asChild>
                  <Link href="/create-podcast">
                    <Mic aria-hidden />
                    Crear mi primer podcast
                  </Link>
                </PillButton>
              }
            />
          ) : (
            <EmptyState
              icon={Radio}
              title={`${profile.name} aún no ha publicado podcasts`}
            />
          )
        ) : (
          <PodcastGrid
            podcasts={podcasts}
            skeletons={Math.min(profile.podcastCount, 8) || 4}
          />
        )}
      </section>
    </div>
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
