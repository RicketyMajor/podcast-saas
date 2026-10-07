"use client";

import type { FunctionReturnType } from "convex/server";
import {
  Headphones,
  Link as LinkIcon,
  Mic,
  Pencil,
  Shuffle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { PodcastCardData } from "@/components/podcast/PodcastCard";
import { PillButton } from "@/components/shared/PillButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { api } from "@/convex/_generated/api";
import { formatCount } from "@/lib/utils";
import { usePageCover } from "@/stores/ambient-store";
import { usePlayerStore } from "@/stores/player-store";

export type ProfileData = NonNullable<
  FunctionReturnType<typeof api.users.getById>
>;

export function ProfileHeader({
  profile,
  podcasts,
  isOwner,
}: {
  profile: ProfileData;
  podcasts: PodcastCardData[] | undefined;
  isOwner: boolean;
}) {
  const playable = podcasts?.filter((p) => p.audioUrl !== null) ?? [];
  // The creator's most-played cover lights the profile (ambient mode).
  const topCover = podcasts
    ?.filter((p) => p.imageUrl !== null)
    .reduce<PodcastCardData | null>(
      (top, p) => (top === null || p.views > top.views ? p : top),
      null,
    )?.imageUrl;
  usePageCover(topCover);

  function playRandom() {
    const p = playable[Math.floor(Math.random() * playable.length)];
    if (!p?.audioUrl) return;
    usePlayerStore.getState().play({
      podcastId: p._id,
      title: p.title,
      authorId: p.authorId,
      authorName: p.authorName,
      imageUrl: p.imageUrl,
      audioUrl: p.audioUrl,
      durationSec: p.audioDurationSec,
    });
  }

  return (
    <header className="relative isolate -mx-4 -mt-8 px-4 pt-8 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
      {topCover && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-[150%] animate-in overflow-hidden mask-b-from-20% mask-b-to-100% duration-1000 fade-in-0"
        >
          <Image
            src={topCover}
            alt=""
            fill
            sizes="64px"
            className="scale-150 object-cover opacity-55 blur-3xl saturate-150"
          />
        </div>
      )}

      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:gap-8 sm:text-left">
        <Avatar className="size-36 shadow-2xl ring-1 shadow-black/60 ring-foreground/10 sm:size-44 lg:size-52">
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
          <AvatarFallback className="text-6xl font-semibold">
            {profile.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-4 sm:items-start">
          <h1 className="max-w-full font-display text-[clamp(2rem,4.4vw,3.5rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance break-words">
            {profile.name}
          </h1>
          {profile.bio && (
            <p className="max-w-prose text-pretty text-foreground/80">
              {profile.bio}
            </p>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="-my-2 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full text-sm font-medium text-foreground/80 hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <LinkIcon aria-hidden className="size-4 shrink-0" />
              {/* updateProfile only stores URLs that websiteError accepts. */}
              <span className="truncate">
                {new URL(profile.website).host.replace(/^www\./, "")}
              </span>
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          )}
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-foreground/80">
            <li className="flex items-center gap-1.5">
              <Mic aria-hidden className="size-4" />
              <span className="tabular-nums">
                {formatCount(profile.podcastCount)}
              </span>
              {profile.podcastCount === 1 ? "podcast" : "podcasts"}
            </li>
            <li className="flex items-center gap-1.5">
              <Headphones aria-hidden className="size-4" />
              <span className="tabular-nums">
                {formatCount(profile.totalViews)}
              </span>
              {profile.totalViews === 1 ? "reproducción" : "reproducciones"}
            </li>
          </ul>
          {(profile.podcastCount > 0 || isOwner) && (
            <div className="flex flex-wrap justify-center gap-3 pt-1 sm:justify-start">
              {profile.podcastCount > 0 && (
                <PillButton
                  disabled={playable.length === 0}
                  onClick={playRandom}
                >
                  <Shuffle aria-hidden />
                  Reproducir aleatorio
                </PillButton>
              )}
              {isOwner && (
                <PillButton asChild tone="glass">
                  <Link href="/create-podcast">
                    <Mic aria-hidden />
                    Crear podcast
                  </Link>
                </PillButton>
              )}
              {isOwner && (
                <PillButton asChild tone="glass">
                  <Link href="/settings">
                    <Pencil aria-hidden />
                    Editar perfil
                  </Link>
                </PillButton>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
