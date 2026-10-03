"use client";

import { useEffect } from "react";

import { getCoverColor } from "@/lib/cover-color";
import { cn } from "@/lib/utils";
import { useAmbientStore } from "@/stores/ambient-store";
import { usePlayerStore } from "@/stores/player-store";

/**
 * Sets --ambient from the playing cover (else the page's cover) and paints
 * the glow behind the app. The color fade is a registered-property
 * transition in globals.css; this only swaps the value.
 */
export function AmbientBackdrop() {
  const trackCover = usePlayerStore((s) => s.track?.imageUrl ?? null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const pageCover = useAmbientStore((s) => s.pageCover);
  const cover = trackCover ?? pageCover;

  useEffect(() => {
    const root = document.documentElement;
    if (!cover) {
      root.style.removeProperty("--ambient");
      return;
    }
    let stale = false;
    void getCoverColor(cover).then((color) => {
      if (stale) return;
      if (color) root.style.setProperty("--ambient", color);
      else root.style.removeProperty("--ambient");
    });
    return () => {
      stale = true;
    };
  }, [cover]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed -inset-[10%] -z-10 transition-opacity duration-1000 ease-out",
        "bg-[radial-gradient(140%_70%_at_25%_-5%,color-mix(in_oklch,var(--ambient)_34%,transparent),transparent_70%),radial-gradient(90%_60%_at_95%_105%,color-mix(in_oklch,var(--ambient)_20%,transparent),transparent_70%)]",
        // The light follows the sound: brighter, and slowly breathing, while
        // something plays (the drift stops under reduced motion).
        isPlaying
          ? "opacity-100 motion-safe:animate-[ambient-drift_24s_ease-in-out_infinite]"
          : "opacity-45",
      )}
    />
  );
}
