"use client";

import type { FunctionReturnType } from "convex/server";
import { Mic, Shuffle } from "lucide-react";
import Link from "next/link";

import type { PodcastCardData } from "@/components/podcast/PodcastCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { api } from "@/convex/_generated/api";
import { formatCount } from "@/lib/utils";
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
    <header className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
      <Avatar className="size-32 border border-border sm:size-40">
        {profile.image && <AvatarImage src={profile.image} alt="" />}
        <AvatarFallback className="text-5xl font-semibold">
          {profile.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-4 sm:items-start">
        <h1 className="max-w-full text-[1.75rem] leading-tight font-bold tracking-tight text-balance break-words sm:text-[2.25rem]">
          {profile.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="tabular-nums">
            {formatCount(profile.podcastCount)}
          </span>{" "}
          {profile.podcastCount === 1 ? "podcast" : "podcasts"} ·{" "}
          <span className="tabular-nums">
            {formatCount(profile.totalViews)}
          </span>{" "}
          {profile.totalViews === 1 ? "reproducción" : "reproducciones"}
        </p>
        {(profile.podcastCount > 0 || isOwner) && (
          <div className="flex flex-wrap justify-center gap-2">
            {profile.podcastCount > 0 && (
              <Button
                size="lg"
                className="h-11 rounded-full px-6"
                disabled={playable.length === 0}
                onClick={playRandom}
              >
                <Shuffle aria-hidden />
                Reproducir aleatorio
              </Button>
            )}
            {isOwner && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-full px-6"
              >
                <Link href="/create-podcast">
                  <Mic aria-hidden />
                  Crear podcast
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
