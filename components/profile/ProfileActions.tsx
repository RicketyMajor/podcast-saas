"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { Ban, MoreHorizontal, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PillButton } from "@/components/shared/PillButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/utils";

import { BlockDialog } from "./BlockDialog";
import type { ProfileData } from "./ProfileHeader";

/** Someone else's profile: follow it, or block it from the ⋯ menu. */
export function ProfileActions({ profile }: { profile: ProfileData }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const follow = useMutation(api.users.follow);
  const unfollow = useMutation(api.users.unfollow);
  const [pending, setPending] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  // Nothing until the session is known, rather than a link that turns into
  // a button under the pointer.
  if (isLoading) return null;
  if (!isAuthenticated) {
    const back = encodeURIComponent(`/profile/${profile._id}`);
    return (
      <PillButton asChild tone="glass">
        <Link href={`/sign-in?redirectTo=${back}`}>
          <UserPlus aria-hidden />
          Seguir
        </Link>
      </PillButton>
    );
  }

  async function toggleFollow() {
    setPending(true);
    try {
      if (profile.following) await unfollow({ userId: profile._id });
      else await follow({ userId: profile._id });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PillButton tone="glass" disabled={pending} onClick={toggleFollow}>
        {profile.following ? (
          <UserCheck aria-hidden />
        ) : (
          <UserPlus aria-hidden />
        )}
        {profile.following ? "Siguiendo" : "Seguir"}
      </PillButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-12 rounded-full border-foreground/15 bg-background/30 backdrop-blur-md"
            aria-label={`Más acciones para ${profile.name}`}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setBlockOpen(true)}
          >
            <Ban aria-hidden />
            Bloquear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BlockDialog
        user={profile}
        open={blockOpen}
        onOpenChange={setBlockOpen}
      />
    </>
  );
}
