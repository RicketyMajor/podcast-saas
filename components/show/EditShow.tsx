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

  let content;
  if (show === undefined || me === undefined) {
    content = (
      <Loader2
        aria-label="Cargando show"
        className="mx-auto size-8 animate-spin text-muted-foreground"
      />
    );
  } else if (show === null) {
    content = <ShowNotFound />;
  } else if (me?._id !== show.authorId) {
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
    content = <ShowForm show={show} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SectionHeader as="h1" title="Editar show" />
      {content}
    </div>
  );
}
