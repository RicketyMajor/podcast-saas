import type { Metadata } from "next";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { ShowForm } from "@/components/show/ShowForm";

export const metadata: Metadata = { title: "Crear show" };

export default async function NewShowPage({
  searchParams,
}: PageProps<"/shows/new">) {
  // `?next=create` comes from the create form: return there with the show.
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SectionHeader as="h1" title="Crear show" />
      <ShowForm next={next === "create" ? "create" : undefined} />
    </div>
  );
}
