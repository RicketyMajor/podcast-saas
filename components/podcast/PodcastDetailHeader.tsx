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
  Pencil,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, ViewTransition } from "react";
import { toast } from "sonner";

import { PlayPauseIcon } from "@/components/player/PlayPauseIcon";
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
import { usePageCover } from "@/stores/ambient-store";
import { usePlayerStore } from "@/stores/player-store";

import { coverTransitionName } from "./PodcastCard";

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
  usePageCover(podcast.imageUrl);

  const headerRef = useRef<HTMLElement>(null);
  const [headerOut, setHeaderOut] = useState(false);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderOut(!!entry && !entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    <>
      <header
        ref={headerRef}
        className="relative isolate -mx-4 -mt-8 px-4 pt-8 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10"
      >
        {/* Ambient mode: the cover itself, blurred, spills behind the header. */}
        {podcast.imageUrl && (
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-[140%] overflow-hidden mask-b-from-20% mask-b-to-100%"
          >
            <Image
              src={podcast.imageUrl}
              alt=""
              fill
              sizes="64px"
              className="scale-150 object-cover opacity-55 blur-3xl saturate-150"
            />
          </div>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
          <ViewTransition
            name={coverTransitionName(podcast._id)}
            share="cover"
            enter="cover"
            default="none"
          >
            <div className="relative aspect-square w-full max-w-64 shrink-0 self-center overflow-hidden rounded-2xl bg-muted shadow-2xl ring-1 shadow-black/60 ring-foreground/10 sm:w-56 sm:self-auto lg:w-64">
              {podcast.imageUrl ? (
                <Image
                  src={podcast.imageUrl}
                  alt=""
                  fill
                  priority
                  sizes="256px"
                  className="object-cover"
                />
              ) : (
                <AudioLines
                  aria-hidden
                  className="absolute inset-0 m-auto size-12 text-muted-foreground"
                />
              )}
            </div>
          </ViewTransition>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <h1 className="font-display text-[clamp(2rem,4.4vw,3.5rem)] leading-[1.02] font-extrabold tracking-[-0.035em] break-words">
              {podcast.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Link
                href={`/profile/${podcast.authorId}`}
                className="flex min-w-0 items-center gap-2 rounded-full hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Avatar className="size-7">
                  {podcast.authorImageUrl && (
                    <AvatarImage src={podcast.authorImageUrl} alt="" />
                  )}
                  <AvatarFallback className="text-xs">
                    {podcast.authorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-semibold">
                  {podcast.authorName}
                </span>
              </Link>
              <AiBadge />
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/80">
              <li className="flex items-center gap-1.5">
                <Headphones aria-hidden className="size-4" />
                <span className="tabular-nums">
                  {formatCount(podcast.views)}
                </span>
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
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="lg"
                className="h-12 rounded-full px-7 text-base shadow-lg shadow-black/30 transition-transform active:scale-95"
                disabled={!podcast.audioUrl}
                onClick={togglePlay}
              >
                <PlayPauseIcon playing={playing} className="size-5" />
                {playing ? "Pausar" : "Reproducir"}
              </Button>
              {isOwner && <AuthorActions podcast={podcast} />}
            </div>
          </div>
        </div>
      </header>
      {/* Outside the header: its `isolate` would trap the bar under later sections. */}

      <StickyTitleBar
        visible={headerOut}
        title={podcast.title}
        imageUrl={podcast.imageUrl}
        playing={playing}
        canPlay={!!podcast.audioUrl}
        onToggle={togglePlay}
      />
    </>
  );
}

/** Glass bar that slides in once the header scrolls away, so play stays at hand. */
function StickyTitleBar({
  visible,
  title,
  imageUrl,
  playing,
  canPlay,
  onToggle,
}: {
  visible: boolean;
  title: string;
  imageUrl: string | null;
  playing: boolean;
  canPlay: boolean;
  onToggle: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "-110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 top-16 z-30 border-b border-foreground/8 bg-background/70 backdrop-blur-2xl backdrop-saturate-150 lg:top-0 lg:left-68 xl:right-78"
        >
          <div className="flex h-14 items-center gap-3 px-4 lg:px-10">
            <Button
              size="icon"
              className="size-10 shrink-0 rounded-full transition-transform active:scale-95"
              aria-label={playing ? "Pausar" : "Reproducir"}
              disabled={!canPlay}
              onClick={onToggle}
            >
              <PlayPauseIcon playing={playing} className="size-4" />
            </Button>
            {imageUrl && (
              <Image
                src={imageUrl}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-md object-cover"
              />
            )}
            <p className="truncate font-display font-bold">{title}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
            className="size-12 rounded-full border-foreground/15 bg-background/30 backdrop-blur-md"
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
