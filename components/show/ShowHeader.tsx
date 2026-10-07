"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Globe,
  Headphones,
  ListMusic,
  MoreHorizontal,
  Pencil,
  Plus,
  Radio,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PlayPauseIcon } from "@/components/player/PlayPauseIcon";
import type { PodcastCardData } from "@/components/podcast/PodcastCard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PillButton } from "@/components/shared/PillButton";
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
import { SHOW_CATEGORIES } from "@/convex/lib/limits";
import { errorMessage, formatCount } from "@/lib/utils";
import { usePageCover } from "@/stores/ambient-store";
import { usePlayerStore } from "@/stores/player-store";

import { CopyFeedButton } from "./CopyFeedButton";

export type ShowDetailData = NonNullable<
  FunctionReturnType<typeof api.shows.getById>
>;

const CHIP =
  "inline-flex items-center rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium text-foreground/85 backdrop-blur-md";

export function ShowHeader({
  show,
  latest,
  isOwner,
}: {
  show: ShowDetailData;
  /** Newest episode: what "Reproducir" plays. `undefined` while loading. */
  latest: PodcastCardData | null | undefined;
  isOwner: boolean;
}) {
  const playing = usePlayerStore(
    (s) => s.isPlaying && !!latest && s.track?.podcastId === latest._id,
  );
  const category =
    SHOW_CATEGORIES.find((c) => c.value === show.category)?.label ??
    show.category;
  const language =
    LANGUAGES.find((l) => l.code === show.languageCode)?.label ??
    show.languageCode;
  usePageCover(show.imageUrl);

  function togglePlay() {
    const { play, pause } = usePlayerStore.getState();
    if (playing) return pause();
    if (!latest?.audioUrl) return;
    play({
      podcastId: latest._id,
      title: latest.title,
      authorId: latest.authorId,
      authorName: latest.authorName,
      imageUrl: latest.imageUrl,
      audioUrl: latest.audioUrl,
      durationSec: latest.audioDurationSec,
    });
  }

  const empty = show.episodeCount === 0;

  return (
    <header className="relative isolate -mx-4 -mt-8 px-4 pt-8 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
      {/* Ambient mode: the cover itself, blurred, spills behind the header. */}
      {show.imageUrl && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-[140%] overflow-hidden mask-b-from-20% mask-b-to-100%"
        >
          <Image
            src={show.imageUrl}
            alt=""
            fill
            sizes="64px"
            loading="eager"
            fetchPriority="high"
            className="scale-150 object-cover opacity-55 blur-3xl saturate-150"
          />
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
        <div className="relative aspect-square w-full max-w-64 shrink-0 self-center overflow-hidden rounded-2xl bg-muted shadow-2xl ring-1 shadow-black/60 ring-foreground/10 sm:w-56 sm:self-auto lg:w-64">
          {show.imageUrl ? (
            <Image
              src={show.imageUrl}
              alt=""
              fill
              priority
              sizes="256px"
              className="object-cover"
            />
          ) : (
            <Radio
              aria-hidden
              className="absolute inset-0 m-auto size-12 text-muted-foreground"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <h1 className="font-display text-[clamp(2rem,4.4vw,3.5rem)] leading-[1.02] font-extrabold tracking-[-0.035em] break-words">
            {show.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link
              href={`/profile/${show.authorId}`}
              className="flex min-w-0 items-center gap-2 rounded-full hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Avatar className="size-7">
                {show.authorImageUrl && (
                  <AvatarImage src={show.authorImageUrl} alt="" />
                )}
                <AvatarFallback className="text-xs">
                  {show.authorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-semibold">{show.authorName}</span>
            </Link>
            <span className={CHIP}>{category}</span>
            {show.explicit && (
              <span className={CHIP} title="Contenido explícito">
                Explícito
              </span>
            )}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/80">
            <li className="flex items-center gap-1.5">
              <ListMusic aria-hidden className="size-4" />
              <span className="tabular-nums">
                {formatCount(show.episodeCount)}
              </span>
              {show.episodeCount === 1 ? "episodio" : "episodios"}
            </li>
            <li className="flex items-center gap-1.5">
              <Headphones aria-hidden className="size-4" />
              <span className="tabular-nums">
                {formatCount(show.totalViews)}
              </span>
              {show.totalViews === 1 ? "reproducción" : "reproducciones"}
            </li>
            <li className="flex items-center gap-1.5">
              <Globe aria-hidden className="size-4" />
              <span className="sr-only">Idioma:</span>
              {language}
            </li>
          </ul>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!empty && (
              <>
                <Button
                  size="lg"
                  className="h-12 rounded-full px-7 text-base shadow-lg shadow-black/30 transition-transform active:scale-95"
                  disabled={!latest?.audioUrl}
                  onClick={togglePlay}
                >
                  <PlayPauseIcon playing={playing} className="size-5" />
                  {playing ? "Pausar" : "Reproducir"}
                </Button>
                <CopyFeedButton showId={show._id} />
              </>
            )}
            {isOwner && (
              <>
                {/* One ivory action: "Nuevo episodio" only while there's nothing to play. */}
                <PillButton asChild tone={empty ? "primary" : "glass"}>
                  <Link href={`/create-podcast?show=${show._id}`}>
                    <Plus aria-hidden />
                    Nuevo episodio
                  </Link>
                </PillButton>
                <AuthorActions show={show} />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function AuthorActions({ show }: { show: ShowDetailData }) {
  const router = useRouter();
  const removeShow = useMutation(api.shows.remove);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasEpisodes = show.episodeCount > 0;

  async function handleDelete() {
    try {
      await removeShow({ showId: show._id });
      toast.success("Show borrado.");
      router.replace(`/profile/${show.authorId}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-12 rounded-full border-foreground/15 bg-background/30 backdrop-blur-md"
            aria-label="Acciones del show"
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <Link href={`/shows/${show._id}/edit`}>
              <Pencil aria-hidden />
              Editar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={hasEpisodes}
            onSelect={() => setConfirmOpen(true)}
            className="items-start"
          >
            <Trash2 aria-hidden className="mt-0.5" />
            <span className="flex flex-col">
              Borrar
              {hasEpisodes && (
                <span className="text-xs text-muted-foreground">
                  Mueve o borra sus episodios primero
                </span>
              )}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`¿Borrar «${show.title}»?`}
        description="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        pendingLabel="Borrando…"
        onConfirm={handleDelete}
      />
    </>
  );
}
