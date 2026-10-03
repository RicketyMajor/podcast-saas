"use client";

import { useQuery } from "convex/react";
import { ChevronRight, UserPlus } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

export function UserCard() {
  const me = useQuery(api.users.current);

  if (me === undefined) return <Skeleton className="h-16 w-full rounded-xl" />;

  if (me === null) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-card/60 p-4 ring-1 ring-foreground/8">
        <p className="text-sm text-pretty text-muted-foreground">
          Crea tu cuenta para publicar tus podcasts.
        </p>
        <Button
          asChild
          className="h-11 w-full rounded-full text-sm shadow-lg shadow-black/30 transition-transform active:scale-95"
        >
          <Link href="/sign-up">
            <UserPlus aria-hidden />
            Crear cuenta
          </Link>
        </Button>
      </div>
    );
  }

  const name = me.name?.trim() || "Anónimo";
  return (
    <Link
      href={`/profile/${me._id}`}
      className="flex items-center gap-3 rounded-2xl bg-card/60 p-3 ring-1 ring-foreground/8 transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Avatar className="size-10">
        {me.image && <AvatarImage src={me.image} alt="" />}
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
      <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
      <span className="sr-only">Ver mi perfil</span>
    </Link>
  );
}
