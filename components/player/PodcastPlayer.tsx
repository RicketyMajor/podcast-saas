"use client";

import { useMutation } from "convex/react";
import {
  AudioLines,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AiBadge } from "@/components/shared/AiBadge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";

import { PlayerSlider } from "./PlayerSlider";

const SKIP_SEC = 15;
const ICON_BUTTON = "size-11";

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
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const { bindAudio, toggle, seek, skip, setVolume, toggleMute, close } =
    usePlayerStore.getState();
  const registerView = useMutation(api.podcasts.registerView);
  const [dragTime, setDragTime] = useState<number | null>(null);

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

  return (
    <>
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

      {track && (
        <section
          aria-label="Reproductor"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:left-68"
        >
          <PlayerSlider
            className="absolute inset-x-0 -top-2"
            value={shownTime}
            max={duration}
            step={1}
            label="Progreso"
            valueText={`${formatDuration(shownTime)} de ${formatDuration(duration)}`}
            onValueChange={setDragTime}
            onValueCommit={(sec) => {
              seek(sec);
              setDragTime(null);
            }}
          />

          <div className="flex h-16 items-center gap-3 px-3 lg:h-22 lg:gap-6 lg:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted lg:size-16 lg:rounded-xl">
                {track.imageUrl ? (
                  <Image
                    src={track.imageUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <AudioLines
                    aria-hidden
                    className="absolute inset-0 m-auto size-5 text-muted-foreground"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <Link
                  href={`/podcasts/${track.podcastId}`}
                  className="truncate text-sm font-semibold hover:underline lg:text-base"
                >
                  {track.title}
                </Link>
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    href={`/profile/${track.authorId}`}
                    className="truncate text-xs text-muted-foreground hover:underline lg:text-sm"
                  >
                    {track.authorName}
                  </Link>
                  <AiBadge className="hidden shrink-0 lg:inline-flex" />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`${ICON_BUTTON} hidden lg:inline-flex`}
                aria-label={`Retroceder ${SKIP_SEC} segundos`}
                onClick={() => skip(-SKIP_SEC)}
              >
                <RotateCcw aria-hidden />
              </Button>
              <Button
                size="icon"
                className={`${ICON_BUTTON} rounded-full`}
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
                onClick={toggle}
              >
                {isPlaying ? (
                  <Pause aria-hidden className="fill-current" />
                ) : (
                  <Play aria-hidden className="fill-current" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`${ICON_BUTTON} hidden lg:inline-flex`}
                aria-label={`Adelantar ${SKIP_SEC} segundos`}
                onClick={() => skip(SKIP_SEC)}
              >
                <RotateCw aria-hidden />
              </Button>
            </div>

            <div className="hidden flex-1 items-center justify-end gap-2 lg:flex">
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatDuration(shownTime)} / {formatDuration(duration)}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className={ICON_BUTTON}
                aria-label={muted ? "Activar sonido" : "Silenciar"}
                aria-pressed={muted}
                onClick={toggleMute}
              >
                {muted || volume === 0 ? (
                  <VolumeX aria-hidden />
                ) : (
                  <Volume2 aria-hidden />
                )}
              </Button>
              <PlayerSlider
                className="w-24"
                value={muted ? 0 : volume}
                max={1}
                step={0.05}
                label="Volumen"
                valueText={`${Math.round((muted ? 0 : volume) * 100)} %`}
                onValueChange={setVolume}
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={ICON_BUTTON}
              aria-label="Cerrar reproductor"
              onClick={close}
            >
              <X aria-hidden />
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
