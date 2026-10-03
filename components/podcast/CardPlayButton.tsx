"use client";

import { PlayPauseIcon } from "@/components/player/PlayPauseIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlayerStore, type Track } from "@/stores/player-store";

export function CardPlayButton({
  track,
  className,
}: {
  track: Track;
  className?: string;
}) {
  const playing = usePlayerStore(
    (s) => s.isPlaying && s.track?.podcastId === track.podcastId,
  );
  return (
    <Button
      size="icon"
      aria-label={`${playing ? "Pausar" : "Reproducir"} ${track.title}`}
      onClick={() => {
        const { play, pause } = usePlayerStore.getState();
        if (playing) pause();
        else play(track);
      }}
      className={cn(
        "size-11 rounded-full shadow-lg shadow-black/40 transition-[opacity,translate,scale] duration-300 ease-out-expo active:scale-95",
        // Rises in on hover or focus; always visible on touch and while playing.
        !playing &&
          "translate-y-2 opacity-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 motion-reduce:translate-y-0 pointer-coarse:translate-y-0 pointer-coarse:opacity-100",
        className,
      )}
    >
      <PlayPauseIcon playing={playing} className="size-5" />
    </Button>
  );
}
