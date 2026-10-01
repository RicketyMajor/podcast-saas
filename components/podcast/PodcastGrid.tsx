import { PodcastCard, type PodcastCardData } from "./PodcastCard";
import { PodcastCardSkeleton } from "./PodcastCardSkeleton";

const GRID = "grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 2xl:grid-cols-4";

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
      {podcasts.map((podcast) => (
        <li key={podcast._id} className="min-w-0">
          <PodcastCard podcast={podcast} />
        </li>
      ))}
    </ul>
  );
}
