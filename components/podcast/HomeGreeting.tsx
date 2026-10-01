"use client";

import { useQuery } from "convex/react";
import { Mic } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

export function HomeGreeting() {
  const user = useQuery(api.users.current);
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {user === undefined ? (
        <Skeleton className="h-9 w-48" />
      ) : (
        <h1 className="text-[1.75rem] font-bold tracking-tight text-balance">
          {firstName ? `Hola, ${firstName}` : "Podcasts creados con IA"}
        </h1>
      )}
      <Button asChild size="lg" className="self-start sm:self-auto">
        <Link href="/create-podcast">
          <Mic aria-hidden />
          Crear podcast
        </Link>
      </Button>
    </div>
  );
}
