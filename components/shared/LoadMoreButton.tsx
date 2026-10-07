import type { PaginationStatus } from "convex/react";
import { Loader2 } from "lucide-react";

import { PillButton } from "@/components/shared/PillButton";

/** "Cargar más" under a paginated list; gone once every page is loaded. */
export function LoadMoreButton({
  status,
  onLoadMore,
}: {
  status: PaginationStatus;
  onLoadMore: () => void;
}) {
  if (status !== "CanLoadMore" && status !== "LoadingMore") return null;
  return (
    <PillButton
      tone="glass"
      className="self-center"
      disabled={status === "LoadingMore"}
      onClick={onLoadMore}
    >
      {status === "LoadingMore" && (
        <Loader2 aria-hidden className="animate-spin" />
      )}
      Cargar más
    </PillButton>
  );
}
