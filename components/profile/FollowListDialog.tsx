"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { Ban, MoreHorizontal, UserCheck, UserMinus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LoadMoreButton } from "@/components/shared/LoadMoreButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { USER_PAGE_MAX } from "@/convex/lib/limits";
import { errorMessage, formatCount } from "@/lib/utils";

import { BlockDialog } from "./BlockDialog";
import type { ProfileData } from "./ProfileHeader";
import { UserRow, UserRowsSkeleton, type UserRowData } from "./UserRow";

type Kind = "followers" | "following";

/** "N seguidores" / "N siguiendo": opens the list in a dialog. */
export function FollowListButton({
  profile,
  kind,
  isOwner,
}: {
  profile: ProfileData;
  kind: Kind;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const followers = kind === "followers";
  const count = followers ? profile.followerCount : profile.followingCount;
  const Icon = followers ? Users : UserCheck;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="-my-3 inline-flex min-h-11 items-center gap-1.5 rounded-full hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Icon aria-hidden className="size-4" />
          <span className="tabular-nums">{formatCount(count)}</span>
          {followers ? (count === 1 ? "seguidor" : "seguidores") : "siguiendo"}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{followers ? "Seguidores" : "Siguiendo"}</DialogTitle>
          <DialogDescription className="sr-only">
            {followers
              ? `Cuentas que siguen a ${profile.name}`
              : `Cuentas que ${profile.name} sigue`}
          </DialogDescription>
        </DialogHeader>
        {/* Radix mounts the content only while open: no query until then. */}
        <FollowList
          profile={profile}
          kind={kind}
          isOwner={isOwner}
          onNavigate={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function FollowList({
  profile,
  kind,
  isOwner,
  onNavigate,
}: {
  profile: ProfileData;
  kind: Kind;
  isOwner: boolean;
  onNavigate: () => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    kind === "followers" ? api.users.getFollowers : api.users.getFollowing,
    { profileId: profile._id },
    { initialNumItems: USER_PAGE_MAX },
  );

  if (status === "LoadingFirstPage") {
    return <UserRowsSkeleton label="Cargando cuentas" />;
  }
  if (results.length === 0 && status === "Exhausted") {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {kind === "followers"
          ? isOwner
            ? "Todavía no tienes seguidores."
            : `${profile.name} todavía no tiene seguidores.`
          : isOwner
            ? "Todavía no sigues a nadie."
            : `${profile.name} todavía no sigue a nadie.`}
      </p>
    );
  }
  return (
    <div className="-mx-2 flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-2">
      <ul className="flex flex-col gap-1">
        {results.map((user) => (
          <UserRow key={user._id} user={user} onNavigate={onNavigate}>
            {kind === "followers" && isOwner && <FollowerMenu user={user} />}
          </UserRow>
        ))}
      </ul>
      <LoadMoreButton
        status={status}
        onLoadMore={() => loadMore(USER_PAGE_MAX)}
      />
    </div>
  );
}

/** Your own followers: remove one, or block them. */
function FollowerMenu({ user }: { user: UserRowData }) {
  const removeFollower = useMutation(api.users.removeFollower);
  const [blockOpen, setBlockOpen] = useState(false);

  async function handleRemove() {
    try {
      await removeFollower({ userId: user._id });
      toast.success(`${user.name} ya no te sigue.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 rounded-full"
            aria-label={`Acciones para ${user.name}`}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void handleRemove()}>
            <UserMinus aria-hidden />
            Eliminar seguidor
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setBlockOpen(true)}
          >
            <Ban aria-hidden />
            Bloquear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BlockDialog user={user} open={blockOpen} onOpenChange={setBlockOpen} />
    </>
  );
}
