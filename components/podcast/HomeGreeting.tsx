"use client";

import { useQuery } from "convex/react";
import { Mic } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { ANONYMOUS_NAME } from "@/convex/lib/profile";

export function HomeGreeting() {
  const user = useQuery(api.users.current);
  // A nameless account gets the tagline, not "Hola, Anónimo".
  const firstName =
    user && user.name !== ANONYMOUS_NAME ? user.name.split(/\s+/)[0] : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {user === undefined ? (
        <Skeleton className="h-9 w-48" />
      ) : (
        <h1 className="text-[1.75rem] font-extrabold tracking-tight text-balance sm:text-[2rem]">
          {firstName ? `Hola, ${firstName}` : "Podcasts creados con IA"}
        </h1>
      )}
      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-11 self-start rounded-full border-foreground/15 bg-background/30 px-5 backdrop-blur-md sm:self-auto"
      >
        <Link href="/create-podcast">
          <Mic aria-hidden />
          Crear podcast
        </Link>
      </Button>
    </div>
  );
}
