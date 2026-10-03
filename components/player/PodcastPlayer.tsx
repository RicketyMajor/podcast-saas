"use client";

import { useMutation } from "convex/react";
import { AudioLines, Maximize2, RotateCcw, RotateCw, X } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AiBadge } from "@/components/shared/AiBadge";
import { EqualizerBars } from "@/components/shared/EqualizerBars";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";

import { NOW_PLAYING_COVER, NowPlaying } from "./NowPlaying";
import { PlayerSlider } from "./PlayerSlider";
import { PlayPauseIcon } from "./PlayPauseIcon";
import { VolumeControl } from "./VolumeControl";

const SKIP_SEC = 15;
const EASE = [0.16, 1, 0.3, 1] as const;

/** Counts a view once per podcast per browser session (architecture §5.6). */
function firstPlayThisSession(podcastId: string) {
  const key = `viewed:${podcastId}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {
    // Storage blocked: count it, the server tolerates duplicates.
  }
  return true;
}

// Typing in a field or using a control must keep its own Space behavior.
function spaceBelongsToTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest(
        "input, textarea, select, button, a, [role=slider], [role=tab]",
      ) !== null)
  );
}

export function PodcastPlayer() {
  const track = usePlayerStore((s) => s.track);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const { bindAudio, toggle, seek, skip, close } = usePlayerStore.getState();
  const registerView = useMutation(api.podcasts.registerView);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  if (!track && expanded) setExpanded(false);

  // P1: Space toggles playback anywhere outside fields and controls.
  useEffect(() => {
    if (!track) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || spaceBelongsToTarget(event.target)) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [track, toggle]);

  // P1: Media Session (lock screen and hardware media keys).
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    if (!track) {
      session.metadata = null;
      return;
    }
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: track.authorName,
      artwork: track.imageUrl ? [{ src: track.imageUrl }] : [],
    });
    const { play, pause } = usePlayerStore.getState();
    session.setActionHandler("play", () => play(track));
    session.setActionHandler("pause", pause);
    session.setActionHandler("seekbackward", () => skip(-SKIP_SEC));
    session.setActionHandler("seekforward", () => skip(SKIP_SEC));
  }, [track, skip]);

  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  const duration = track?.durationSec ?? 0;
  const shownTime = dragTime ?? currentTime;
  const progressText = `${formatDuration(shownTime)} de ${formatDuration(duration)}`;
  const commitScrub = (sec: number) => {
    seek(sec);
    setDragTime(null);
  };

  return (
    // reducedMotion="user": transform and layout animations become instant
    // when the OS asks for less motion; opacity fades remain.
    <MotionConfig reducedMotion="user">
      {/* The only <audio> for podcasts; layouts don't unmount on navigation. */}
      <audio
        ref={bindAudio}
        preload="metadata"
        onPlay={() => usePlayerStore.setState({ isPlaying: true })}
        onPause={() => usePlayerStore.setState({ isPlaying: false })}
        onEnded={() => usePlayerStore.setState({ isPlaying: false })}
        onTimeUpdate={(event) =>
          usePlayerStore.setState({
            currentTime: event.currentTarget.currentTime,
          })
        }
        onPlaying={() => {
          if (track && firstPlayThisSession(track.podcastId)) {
            void registerView({ podcastId: track.podcastId });
          }
        }}
      />

      <AnimatePresence>
        {track && (
          <motion.section
            key="player"
            aria-label="Reproductor"
            initial={{ y: "140%" }}
            animate={{ y: 0 }}
            exit={{ y: "140%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-x-2 bottom-2 z-40 rounded-2xl border border-foreground/10 bg-card/80 shadow-2xl shadow-black/50 backdrop-blur-2xl backdrop-saturate-150 lg:right-3 lg:bottom-3 lg:left-71"
          >
            {/* Ambient wash from the left edge, under the cover. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-r from-ambient/20 via-transparent to-transparent"
            />

            <div className="relative flex h-16 items-center gap-3 px-2.5 lg:h-20 lg:gap-6 lg:px-4">
              <div className="flex min-w-0 flex-1 items-center gap-3 lg:basis-0">
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-label="Expandir reproductor"
                  aria-haspopup="dialog"
                  className="group/cover relative size-11 shrink-0 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:size-14 lg:rounded-xl"
                >
                  {!expanded && (
                    <motion.span
                      layoutId={NOW_PLAYING_COVER}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="absolute inset-0 overflow-hidden rounded-[inherit] bg-muted shadow-md shadow-black/40"
                    >
                      {track.imageUrl ? (
                        <Image
                          src={track.imageUrl}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover transition-transform duration-300 ease-out-expo group-hover/cover:scale-110"
                        />
                      ) : (
                        <AudioLines
                          aria-hidden
                          className="absolute inset-0 m-auto size-5 text-muted-foreground"
                        />
                      )}
                    </motion.span>
                  )}
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-background/55 opacity-0 transition-opacity group-hover/cover:opacity-100 group-focus-visible/cover:opacity-100"
                  >
                    <Maximize2 className="size-4" />
                  </span>
                </button>
                <div className="flex min-w-0 flex-col">
                  <Link
                    href={`/podcasts/${track.podcastId}`}
                    className="truncate text-sm font-semibold hover:underline lg:text-base"
                  >
                    {track.title}
                  </Link>
                  <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <EqualizerBars
                      playing={isPlaying}
                      className="h-3 shrink-0 text-ambient"
                    />
                    <Link
                      href={`/profile/${track.authorId}`}
                      className="truncate text-xs hover:text-foreground hover:underline lg:text-sm"
                    >
                      {track.authorName}
                    </Link>
                    <AiBadge className="hidden shrink-0 lg:inline-flex" />
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-center gap-0.5 lg:flex-[1.4] lg:basis-0">
                <div className="flex items-center gap-1 lg:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden size-11 rounded-full lg:inline-flex"
                    aria-label={`Retroceder ${SKIP_SEC} segundos`}
                    onClick={() => skip(-SKIP_SEC)}
                  >
                    <RotateCcw aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    className="size-11 rounded-full transition-transform active:scale-95"
                    aria-label={isPlaying ? "Pausar" : "Reproducir"}
                    onClick={toggle}
                  >
                    <PlayPauseIcon playing={isPlaying} className="size-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden size-11 rounded-full lg:inline-flex"
                    aria-label={`Adelantar ${SKIP_SEC} segundos`}
                    onClick={() => skip(SKIP_SEC)}
                  >
                    <RotateCw aria-hidden />
                  </Button>
                </div>
                <div className="hidden w-full max-w-xl items-center gap-3 text-xs text-muted-foreground tabular-nums lg:flex">
                  <span className="w-10 text-right">
                    {formatDuration(shownTime)}
                  </span>
                  <PlayerSlider
                    className="flex-1"
                    value={shownTime}
                    max={duration}
                    step={1}
                    label="Progreso"
                    valueText={progressText}
                    onValueChange={setDragTime}
                    onValueCommit={commitScrub}
                  />
                  <span className="w-10">{formatDuration(duration)}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-1 lg:flex-1 lg:basis-0">
                <VolumeControl className="hidden xl:flex" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-full"
                  aria-label="Cerrar reproductor"
                  onClick={close}
                >
                  <X aria-hidden />
                </Button>
              </div>
            </div>

            {/* Mobile: progress rides the bottom edge of the bar. */}
            <PlayerSlider
              className="absolute inset-x-3 -bottom-2 lg:hidden"
              value={shownTime}
              max={duration}
              step={1}
              label="Progreso"
              valueText={progressText}
              onValueChange={setDragTime}
              onValueCommit={commitScrub}
            />
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {track && expanded && (
          <NowPlaying
            key="now-playing"
            track={track}
            shownTime={shownTime}
            onScrub={setDragTime}
            onScrubEnd={commitScrub}
            onClose={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
