"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { formatCount } from "@/lib/utils";

export function TopCreators() {
  const creators = useQuery(api.users.getTopCreators, { limit: 5 });
  if (creators?.length === 0) return null;

  return (
    <section aria-labelledby="top-creators" className="flex flex-col gap-3">
      <h2 id="top-creators" className="text-lg font-bold tracking-tight">
        Top creadores
      </h2>
      {creators === undefined ? (
        <div
          role="status"
          aria-busy="true"
          aria-label="Cargando creadores"
          className="flex flex-col gap-2"
        >
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {creators.map((creator) => (
            <li key={creator._id}>
              <Link
                href={`/profile/${creator._id}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Avatar className="size-9">
                  {creator.avatarUrl && (
                    <AvatarImage src={creator.avatarUrl} alt="" />
                  )}
                  <AvatarFallback>
                    {creator.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {creator.name}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {formatCount(creator.podcastCount)}{" "}
                  {creator.podcastCount === 1 ? "podcast" : "podcasts"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
