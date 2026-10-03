"use client";

import { Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

/** Play ↔ pause swap with a short spin-and-scale, so the state change reads. */
export function PlayPauseIcon({
  playing,
  className,
}: {
  playing: boolean;
  className?: string;
}) {
  const Icon = playing ? Pause : Play;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={playing ? "pause" : "play"}
        initial={{ scale: 0.4, opacity: 0, rotate: -45 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.4, opacity: 0, rotate: 45 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="flex"
      >
        <Icon
          aria-hidden
          className={cn(
            "fill-current",
            !playing && "translate-x-px",
            className,
          )}
        />
      </motion.span>
    </AnimatePresence>
  );
}
