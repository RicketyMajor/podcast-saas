"use client";

import { motion } from "motion/react";

import { PodcastCard, type PodcastCardData } from "./PodcastCard";
import { PodcastCardSkeleton } from "./PodcastCardSkeleton";

const GRID = "grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 2xl:grid-cols-4";
const STAGGER_SEC = 0.04;
const STAGGER_CAP = 8; // a page of results; later pages restart the count

/** `undefined` = loading (skeletons); the caller handles the empty case. */
export function PodcastGrid({
  podcasts,
  skeletons = 8,
}: {
  podcasts: PodcastCardData[] | undefined;
  skeletons?: number;
}) {
  if (podcasts === undefined) {
    return (
      <div className={GRID} aria-busy="true" aria-label="Cargando podcasts">
        {Array.from({ length: skeletons }, (_, i) => (
          <PodcastCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <ul className={GRID}>
      {podcasts.map((podcast, i) => (
        <motion.li
          key={podcast._id}
          // `layout`: when the reactive order changes, cards glide to their
          // new slot instead of jumping.
          layout="position"
          initial={{ y: 16 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: "0px 0px -40px 0px" }}
          transition={{
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
            delay: (i % STAGGER_CAP) * STAGGER_SEC,
          }}
          className="min-w-0"
        >
          <PodcastCard podcast={podcast} />
        </motion.li>
      ))}
    </ul>
  );
}
