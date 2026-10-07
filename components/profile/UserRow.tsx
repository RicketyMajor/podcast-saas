import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";

export type UserRowData = {
  _id: Id<"users">;
  name: string;
  avatarUrl: string | null;
};

/** An account in a list: photo and name open the profile; actions on the right. */
export function UserRow({
  user,
  onNavigate,
  children,
}: {
  user: UserRowData;
  /** E.g. close the dialog the list lives in. */
  onNavigate?: () => void;
  children?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <Link
        href={`/profile/${user._id}`}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Avatar className="size-10">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate font-medium">{user.name}</span>
      </Link>
      {children}
    </li>
  );
}

export function UserRowsSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="flex flex-col gap-2"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}
