import { PodcastCardSkeleton } from "@/components/podcast/PodcastCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Instant feedback while a route's server part loads; pages then show their
// own skeletons while Convex data arrives. Same grid as PodcastGrid.
export default function Loading() {
  return (
    <div
      className="flex flex-col gap-8"
      role="status"
      aria-busy="true"
      aria-label="Cargando"
    >
      <Skeleton className="h-10 w-56 rounded-xl" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <PodcastCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
