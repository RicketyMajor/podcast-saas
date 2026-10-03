import { Skeleton } from "@/components/ui/skeleton";

// The detail page loads its podcast on the server: this holds the header's
// shape meanwhile.
export default function Loading() {
  return (
    <div
      className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8"
      aria-busy="true"
      aria-label="Cargando podcast"
    >
      <Skeleton className="aspect-square w-full max-w-64 self-center rounded-2xl sm:w-56 sm:self-auto lg:w-64" />
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-14 w-3/4 rounded-xl" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-12 w-40 rounded-full" />
      </div>
    </div>
  );
}
