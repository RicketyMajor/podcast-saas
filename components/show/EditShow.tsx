"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { PillButton } from "@/components/shared/PillButton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { api } from "@/convex/_generated/api";

import { ShowNotFound } from "./ShowDetail";
import { ShowForm } from "./ShowForm";

export function EditShow({ showId }: { showId: string }) {
  const show = useQuery(api.shows.getById, { showId });
  const me = useQuery(api.users.current);
  // The email isn't public: only the author's status query has it.
  const status = useQuery(api.shows.getDirectoryStatus, { showId });

  const isAuthor = !!show && me?._id === show.authorId;

  let content;
  // The form reads the email once, as a default: wait for it (an author's
  // status is never null once auth settles), or saving would clear it.
  if (
    show === undefined ||
    me === undefined ||
    status === undefined ||
    (isAuthor && status === null)
  ) {
    content = (
      <Loader2
        aria-label="Cargando show"
        className="mx-auto size-8 animate-spin text-muted-foreground"
      />
    );
  } else if (show === null) {
    content = <ShowNotFound />;
  } else if (!isAuthor || status === null) {
    content = (
      <EmptyState
        icon={Lock}
        title="No puedes editar este show"
        description="Solo su autor puede modificarlo."
        action={
          <PillButton asChild tone="glass">
            <Link href={`/shows/${show._id}`}>
              <ArrowLeft aria-hidden />
              Ver el show
            </Link>
          </PillButton>
        }
      />
    );
  } else {
    content = <ShowForm show={show} email={status.email} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SectionHeader as="h1" title="Editar show" />
      {content}
    </div>
  );
}
