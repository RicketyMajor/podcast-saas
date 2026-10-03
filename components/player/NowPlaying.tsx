"use client";

import { AudioLines, ChevronDown, RotateCcw, RotateCw } from "lucide-react";
import { motion, useDragControls } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";

import { AiBadge } from "@/components/shared/AiBadge";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore, type Track } from "@/stores/player-store";

import { PlayerSlider } from "./PlayerSlider";
import { PlayPauseIcon } from "./PlayPauseIcon";
import { VolumeControl } from "./VolumeControl";

export const NOW_PLAYING_COVER = "now-playing-cover";
const SKIP_SEC = 15;
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Full-screen "Ahora suena". The cover morphs from the bar (shared layoutId);
 * the backdrop is the cover itself, blurred: the ambient at its loudest.
 * Mount it inside <AnimatePresence> so the exit plays.
 */
export function NowPlaying({
  track,
  shownTime,
  onScrub,
  onScrubEnd,
  onClose,
  returnFocusRef,
}: {
  track: Track;
  shownTime: number;
  onScrub: (sec: number) => void;
  onScrubEnd: (sec: number) => void;
  onClose: () => void;
  /** The bar's cover button: no Dialog.Trigger here, so focus is returned by hand. */
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { toggle, skip } = usePlayerStore.getState();
  const drag = useDragControls();
  const duration = track.durationSec;

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Content
          asChild
          forceMount
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ duration: 0.35, ease: EASE }}
            // Pull down to dismiss, from the handle or the cover only, so
            // the sliders keep their own drag.
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 700) onClose();
            }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background outline-none"
          >
            {track.imageUrl && (
              <Image
                src={track.imageUrl}
                alt=""
                fill
                sizes="64px"
                aria-hidden
                className="scale-125 object-cover opacity-75 blur-3xl saturate-150"
              />
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-linear-to-b from-background/35 via-background/45 to-background/75"
            />

            <div className="relative flex items-center justify-between gap-4 px-4 pt-4 sm:px-8 sm:pt-6">
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-full"
                  aria-label="Minimizar reproductor"
                >
                  <ChevronDown aria-hidden className="size-6" />
                </Button>
              </DialogPrimitive.Close>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onPointerDown={(e) => drag.start(e)}
                className="h-1.5 w-12 cursor-grab touch-none rounded-full bg-foreground/25 active:cursor-grabbing md:invisible"
              />
              <Button
                asChild
                variant="ghost"
                className="h-11 rounded-full px-4"
              >
                <Link href={`/podcasts/${track.podcastId}`} onClick={onClose}>
                  Ver episodio
                </Link>
              </Button>
            </div>

            <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 pb-10 sm:max-w-lg">
              <motion.div
                layoutId={NOW_PLAYING_COVER}
                transition={{ duration: 0.45, ease: EASE }}
                onPointerDown={(e) => drag.start(e)}
                className="relative mx-auto aspect-square w-full max-w-[min(100%,46vh)] touch-none overflow-hidden rounded-3xl bg-muted shadow-2xl shadow-black/60"
              >
                {track.imageUrl ? (
                  <Image
                    src={track.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 460px, 90vw"
                    className="pointer-events-none object-cover"
                  />
                ) : (
                  <AudioLines
                    aria-hidden
                    className="absolute inset-0 m-auto size-16 text-muted-foreground"
                  />
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12, ease: EASE }}
                className="flex flex-col gap-2"
              >
                <DialogPrimitive.Title className="font-display text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-3xl">
                  {track.title}
                </DialogPrimitive.Title>
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    href={`/profile/${track.authorId}`}
                    onClick={onClose}
                    className="truncate text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {track.authorName}
                  </Link>
                  <AiBadge className="shrink-0" />
                </div>
              </motion.div>

              <div className="flex flex-col gap-1.5">
                <PlayerSlider
                  value={shownTime}
                  max={duration}
                  step={1}
                  label="Progreso"
                  valueText={`${formatDuration(shownTime)} de ${formatDuration(duration)}`}
                  onValueChange={onScrub}
                  onValueCommit={onScrubEnd}
                />
                <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>{formatDuration(shownTime)}</span>
                  <span>
                    -{formatDuration(Math.max(duration - shownTime, 0))}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-14 rounded-full"
                  aria-label={`Retroceder ${SKIP_SEC} segundos`}
                  onClick={() => skip(-SKIP_SEC)}
                >
                  <RotateCcw aria-hidden className="size-6" />
                </Button>
                <Button
                  size="icon"
                  className="size-18 rounded-full shadow-lg shadow-black/40 transition-transform active:scale-95"
                  aria-label={isPlaying ? "Pausar" : "Reproducir"}
                  onClick={toggle}
                >
                  <PlayPauseIcon playing={isPlaying} className="size-7" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-14 rounded-full"
                  aria-label={`Adelantar ${SKIP_SEC} segundos`}
                  onClick={() => skip(SKIP_SEC)}
                >
                  <RotateCw aria-hidden className="size-6" />
                </Button>
              </div>

              <VolumeControl className="hidden justify-center sm:flex" />
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
