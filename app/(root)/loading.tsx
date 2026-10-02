import { Skeleton } from "@/components/ui/skeleton";

// Instant feedback while a route's server part loads; pages then show their
// own skeletons while Convex data arrives.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}
