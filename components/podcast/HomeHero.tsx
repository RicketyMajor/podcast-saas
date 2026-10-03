"use client";

import { useQuery } from "convex/react";
import { AudioLines, Headphones, TrendingUp } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { PlayPauseIcon } from "@/components/player/PlayPauseIcon";
import { AiBadge } from "@/components/shared/AiBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { formatCount, formatDuration } from "@/lib/utils";
import { usePageCover } from "@/stores/ambient-store";
import { usePlayerStore } from "@/stores/player-store";

import { nameCoverForMorph, type PodcastCardData } from "./PodcastCard";

const EASE = [0.16, 1, 0.3, 1] as const;
// Entrances move but never hide: content is visible (and paints as LCP)
// from the first frame.
const rise = {
  hidden: { y: 18 },
  shown: { y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** #1 in trending, lit by its own cover: the app's first color. */
export function HomeHero({ podcast }: { podcast: PodcastCardData }) {
  usePageCover(podcast.imageUrl);
  // Description and plays; also warms the detail page for the cover morph.
  const detail = useQuery(api.podcasts.getById, { podcastId: podcast._id });
  const coverRef = useRef<HTMLAnchorElement>(null);
  const playing = usePlayerStore(
    (s) => s.isPlaying && s.track?.podcastId === podcast._id,
  );
  const href = `/podcasts/${podcast._id}`;
  const nameCover = () => nameCoverForMorph(coverRef.current, podcast._id);

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
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="hero-title" className="relative">
        {/* Unboxed: the cover's light spills edge to edge, up under the page
            title, and fades into the ground. No `isolate` here, so -z-[5]
            lands behind the greeting too (above the app-wide backdrop). */}
        {podcast.imageUrl && (
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-4 -top-48 -bottom-24 -z-[5] overflow-hidden mask-y-from-55% mask-y-to-100% lg:-inset-x-10"
          >
            <Image
              src={podcast.imageUrl}
              alt=""
              fill
              sizes="64px"
              className="scale-125 object-cover opacity-70 blur-3xl saturate-150"
            />
            <div className="absolute inset-0 bg-linear-to-t from-background/80 via-background/35 to-background/10 sm:bg-linear-to-r" />
          </div>
        )}

        <motion.div
          initial="hidden"
          animate="shown"
          transition={{ staggerChildren: 0.08, delayChildren: 0.1 }}
          className="flex flex-col gap-6 py-4 sm:flex-row sm:items-end sm:gap-10 lg:min-h-[44vh] lg:py-8"
        >
          <motion.div
            variants={{
              hidden: { scale: 0.92, filter: "blur(12px)" },
              shown: {
                scale: 1,
                filter: "blur(0px)",
                transition: { duration: 0.8, ease: EASE },
              },
            }}
            className="w-44 shrink-0 sm:w-56 lg:w-70"
          >
            <Link
              ref={coverRef}
              href={href}
              onClick={nameCover}
              tabIndex={-1}
              aria-hidden
              className="relative block aspect-square overflow-hidden rounded-2xl bg-muted shadow-2xl ring-1 shadow-black/60 ring-foreground/10"
            >
              {podcast.imageUrl ? (
                <Image
                  src={podcast.imageUrl}
                  alt=""
                  fill
                  priority
                  sizes="280px"
                  className="object-cover"
                />
              ) : (
                <AudioLines className="absolute inset-0 m-auto size-12 text-muted-foreground" />
              )}
            </Link>
          </motion.div>

          <div className="flex min-w-0 flex-col gap-4">
            <motion.h2
              id="hero-title"
              variants={rise}
              className="font-display text-[clamp(2.25rem,5.2vw,4.5rem)] leading-[0.98] font-extrabold tracking-[-0.035em] break-words"
            >
              <Link
                href={href}
                onClick={nameCover}
                className="rounded-md outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {podcast.title}
              </Link>
            </motion.h2>
            <motion.div
              variants={rise}
              className="flex flex-col gap-1.5 text-sm text-foreground/80"
            >
              <div className="flex items-center gap-2.5">
                <Link
                  href={`/profile/${podcast.authorId}`}
                  className="truncate font-semibold text-foreground hover:underline"
                >
                  {podcast.authorName}
                </Link>
                <AiBadge className="shrink-0" />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <TrendingUp aria-hidden className="size-4 text-ambient" />
                  N.º 1 en tendencias
                </span>
                <span className="tabular-nums">
                  {formatDuration(podcast.audioDurationSec)}
                </span>
                {detail && (
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Headphones aria-hidden className="size-4" />
                    {formatCount(detail.views)}
                    <span className="sr-only">reproducciones</span>
                  </span>
                )}
              </div>
            </motion.div>
            {detail?.description && (
              <motion.p
                variants={rise}
                className="line-clamp-2 max-w-xl text-pretty text-foreground/75"
              >
                {detail.description}
              </motion.p>
            )}
            <motion.div variants={rise} className="flex gap-3 pt-1">
              <Button
                size="lg"
                className="h-12 flex-1 rounded-full px-7 text-base shadow-lg shadow-black/30 transition-transform active:scale-95 sm:flex-none"
                disabled={!podcast.audioUrl}
                onClick={togglePlay}
              >
                <PlayPauseIcon playing={playing} className="size-5" />
                {playing ? "Pausar" : "Reproducir"}
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 flex-1 rounded-full border-foreground/20 bg-background/30 px-6 text-base backdrop-blur-md sm:flex-none"
              >
                <Link href={href} onClick={nameCover}>
                  Ver episodio
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </MotionConfig>
  );
}

export function HomeHeroSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando destacado"
      className="flex flex-col gap-6 py-4 sm:flex-row sm:items-end sm:gap-10 lg:min-h-[44vh] lg:py-8"
    >
      <Skeleton className="aspect-square w-44 rounded-2xl sm:w-56 lg:w-70" />
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-12 w-40 rounded-full" />
      </div>
    </div>
  );
}
