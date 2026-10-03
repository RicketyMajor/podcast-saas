"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PillButton } from "@/components/shared/PillButton";

// Catches what useQuery throws (server errors) anywhere under the app shell;
// sidebars and the player stay mounted.
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      as="h1"
      icon={TriangleAlert}
      title="Algo salió mal"
      description="No pudimos cargar esta sección. Inténtalo de nuevo."
      action={
        <PillButton onClick={() => retry()}>
          <RotateCw aria-hidden />
          Reintentar
        </PillButton>
      }
    />
  );
}
