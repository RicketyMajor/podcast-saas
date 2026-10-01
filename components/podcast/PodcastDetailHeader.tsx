"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import {
  AudioLines,
  Clock,
  Globe,
  Headphones,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AiBadge } from "@/components/shared/AiBadge";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { LANGUAGES } from "@/convex/ai/voices";
import { formatCount, formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";

export type PodcastDetailData = NonNullable<
  FunctionReturnType<typeof api.podcasts.getById>
>;

export function PodcastDetailHeader({
  podcast,
  isOwner,
}: {
  podcast: PodcastDetailData;
  isOwner: boolean;
}) {
  const playing = usePlayerStore(
    (s) => s.isPlaying && s.track?.podcastId === podcast._id,
  );
  const language =
    LANGUAGES.find((l) => l.code === podcast.languageCode)?.label ??
    podcast.languageCode;

  function togglePlay() {
    const { play, pause } = usePlayerStore.getState();
    if (playing) return pause();
    if (!podcast.audioUrl) return;
    play({
      podcastId: podcast._id,
      title: podcast.title,
      authorId: podcast.authorId,
      authorName: podcast.authorName,
      imageUrl: podcast.imageUrl,
      audioUrl: podcast.audioUrl,
      durationSec: podcast.audioDurationSec,
    });
  }

  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
      <div className="relative aspect-square w-full max-w-62.5 shrink-0 self-center overflow-hidden rounded-2xl border border-border bg-muted sm:self-auto">
        {podcast.imageUrl ? (
          <Image
            src={podcast.imageUrl}
            alt=""
            fill
            priority
            sizes="250px"
            className="object-cover"
          />
        ) : (
          <AudioLines
            aria-hidden
            className="absolute inset-0 m-auto size-12 text-muted-foreground"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <AiBadge className="self-start" />
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-balance break-words sm:text-[2.25rem]">
          {podcast.title}
        </h1>
        <Link
          href={`/profile/${podcast.authorId}`}
          className="flex min-w-0 items-center gap-2 self-start rounded-md hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Avatar className="size-7">
            {podcast.authorImageUrl && (
              <AvatarImage src={podcast.authorImageUrl} alt="" />
            )}
            <AvatarFallback className="text-xs">
              {podcast.authorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{podcast.authorName}</span>
        </Link>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Headphones aria-hidden className="size-4" />
            <span className="tabular-nums">{formatCount(podcast.views)}</span>
            {podcast.views === 1 ? "reproducción" : "reproducciones"}
          </li>
          <li className="flex items-center gap-1.5">
            <Clock aria-hidden className="size-4" />
            <span className="sr-only">Duración:</span>
            <span className="tabular-nums">
              {formatDuration(podcast.audioDurationSec)}
            </span>
          </li>
          <li className="flex items-center gap-1.5">
            <Globe aria-hidden className="size-4" />
            <span className="sr-only">Idioma:</span>
            {language}
          </li>
        </ul>
        <div className="flex items-center gap-2">
          <Button
            size="lg"
            className="h-11 rounded-full px-6"
            disabled={!podcast.audioUrl}
            onClick={togglePlay}
          >
            {playing ? (
              <Pause aria-hidden className="fill-current" />
            ) : (
              <Play aria-hidden className="fill-current" />
            )}
            {playing ? "Pausar" : "Reproducir"}
          </Button>
          {isOwner && <AuthorActions podcast={podcast} />}
        </div>
      </div>
    </header>
  );
}

function AuthorActions({ podcast }: { podcast: PodcastDetailData }) {
  const router = useRouter();
  const removePodcast = useMutation(api.podcasts.remove);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    try {
      await removePodcast({ podcastId: podcast._id });
      // ponytail: only this tab's player closes; other listeners keep a dead
      // audio URL until they pick another podcast.
      const player = usePlayerStore.getState();
      if (player.track?.podcastId === podcast._id) player.close();
      toast.success("Podcast borrado.");
      router.replace(`/profile/${podcast.authorId}`);
    } catch (err) {
      toast.error(
        err instanceof ConvexError
          ? String((err.data as { message?: string }).message)
          : "Algo salió mal. Inténtalo de nuevo.",
      );
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-full"
            aria-label="Acciones del podcast"
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <Link href={`/podcasts/${podcast._id}/edit`}>
              <Pencil aria-hidden />
              Editar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 aria-hidden />
            Borrar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={podcast.title}
        onConfirm={handleDelete}
      />
    </>
  );
}
