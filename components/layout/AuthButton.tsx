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

  if (isLoading) return <Skeleton className="h-11 w-full rounded-full" />;

  if (!isAuthenticated) {
    return (
      <Button
        asChild
        variant="outline"
        className="h-11 w-full rounded-full text-sm transition-transform active:scale-95"
      >
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
      className="h-11 w-full justify-start gap-3 rounded-xl px-3 text-muted-foreground [&_svg:not([class*='size-'])]:size-5"
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
