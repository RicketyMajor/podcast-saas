"use client";

import { useEffect, useState } from "react";

import { formatDuration } from "@/lib/utils";

const TICK_MS = 250;
const CEILING = 0.92; // never claims to be done before the result arrives

/**
 * The AI call reports no progress, so this is an honest estimate: it fills
 * along an ease-out curve tuned to `estimateMs` and slows near the ceiling
 * until the caller unmounts it. Phases change the label; only those changes
 * are announced to screen readers, not every tick.
 */
export function GenerationProgress({
  estimateMs,
  phases,
}: {
  estimateMs: number;
  /** Labels shown in order as the estimate advances. */
  phases: string[];
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(
      () => setElapsed(performance.now() - start),
      TICK_MS,
    );
    return () => clearInterval(id);
  }, []);

  // ~80 % at the estimate, then creeping toward the ceiling.
  const progress = CEILING * (1 - Math.exp((-1.8 * elapsed) / estimateMs));
  const phase =
    phases[
      Math.min(
        phases.length - 1,
        Math.floor((progress / CEILING) * phases.length),
      )
    ]!;
  const percent = Math.round(progress * 100);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{phase}</span>
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {formatDuration(Math.floor(elapsed / 1000))}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Progreso estimado"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${phase} (estimado)`}
        className="relative h-1.5 overflow-hidden rounded-full bg-foreground/12"
      >
        <div
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-ambient transition-transform duration-300 ease-linear"
          style={{ transform: `scaleX(${progress})` }}
        />
        {/* A sheen sweeping the track: it keeps moving even when the
            estimate has slowed down, so a long wait never looks frozen. */}
        <div className="absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-foreground/35 to-transparent motion-safe:animate-[sheen_1.6s_var(--ease-in-out-quart)_infinite] motion-reduce:hidden" />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        ~{percent} % · suele tardar unos {Math.round(estimateMs / 1000)} s
      </p>
      <span aria-live="polite" className="sr-only">
        {phase}
      </span>
    </div>
  );
}
