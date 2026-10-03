"use client";

import { Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";

import { PlayerSlider } from "./PlayerSlider";

export function VolumeControl({ className }: { className?: string }) {
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const { setVolume, toggleMute } = usePlayerStore.getState();
  const shown = muted ? 0 : volume;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 rounded-full"
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
        value={shown}
        max={1}
        step={0.05}
        label="Volumen"
        valueText={`${Math.round(shown * 100)} %`}
        onValueChange={setVolume}
      />
    </div>
  );
}
