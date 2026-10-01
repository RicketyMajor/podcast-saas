import { Skeleton } from "@/components/ui/skeleton";

export function PodcastCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-square rounded-xl" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3.5 w-1/2" />
    </div>
  );
}
