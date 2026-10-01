"use client";

import { Pause, Play } from "lucide-react";

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
        "size-11 rounded-full transition-opacity duration-200 ease-out",
        // Hidden until hover or focus; always visible on touch and while playing.
        !playing &&
          "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100",
        className,
      )}
    >
      {playing ? (
        <Pause aria-hidden className="fill-current" />
      ) : (
        <Play aria-hidden className="fill-current" />
      )}
    </Button>
  );
}
