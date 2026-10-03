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
        "pointer-events-none fixed inset-0 -z-10 transition-opacity duration-700 ease-out",
        "bg-[radial-gradient(90%_55%_at_30%_-12%,color-mix(in_oklch,var(--ambient)_24%,transparent),transparent_72%),radial-gradient(60%_40%_at_100%_110%,color-mix(in_oklch,var(--ambient)_12%,transparent),transparent_70%)]",
        // Brighter while something plays: the light follows the sound.
        isPlaying ? "opacity-100" : "opacity-60",
      )}
    />
  );
}
