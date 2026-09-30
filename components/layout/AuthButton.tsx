"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { LogIn, LogOut } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthButton({ onNavigate }: { onNavigate?: () => void }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (isLoading) return <Skeleton className="h-10 w-full" />;

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href="/sign-in" onClick={onNavigate}>
          <LogIn aria-hidden />
          Iniciar sesión
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="lg"
      className="w-full justify-start text-muted-foreground"
      onClick={async () => {
        await signOut();
        // Full reload so proxy.ts redirects protected pages with the right URL
        // (router.refresh() renders /sign-in but keeps the old URL).
        window.location.reload();
      }}
    >
      <LogOut aria-hidden />
      Cerrar sesión
    </Button>
  );
}
