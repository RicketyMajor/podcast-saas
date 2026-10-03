"use client";

import { usePlayerStore } from "@/stores/player-store";

/** Keeps the fixed player from covering the end of the page. */
export function PlayerSpacer() {
  const visible = usePlayerStore((s) => s.track !== null);
  return visible ? <div aria-hidden className="h-20 shrink-0 lg:h-26" /> : null;
}
