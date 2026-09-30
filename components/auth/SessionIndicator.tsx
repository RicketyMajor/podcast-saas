"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

// Temporary phase 2 indicator; the sidebar takes over in phase 3.
export function SessionIndicator() {
  const user = useQuery(api.users.current);
  const { signOut } = useAuthActions();

  if (user === undefined) {
    return <Skeleton className="h-8 w-40" aria-label="Cargando sesión" />;
  }

  if (user === null) {
    return (
      <p className="flex items-center gap-3 text-sm text-muted-foreground">
        Sin sesión
        <Button asChild variant="outline" size="sm">
          <Link href="/sign-in">Iniciar sesión</Link>
        </Button>
      </p>
    );
  }

  return (
    <p className="flex items-center gap-3 text-sm">
      Hola, {user.name ?? "creador"}
      <Button variant="outline" size="sm" onClick={() => void signOut()}>
        Cerrar sesión
      </Button>
    </p>
  );
}
