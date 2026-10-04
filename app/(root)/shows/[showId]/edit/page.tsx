import type { Metadata } from "next";

import { EditShow } from "@/components/show/EditShow";

export const metadata: Metadata = { title: "Editar show" };

export default async function EditShowPage({
  params,
}: PageProps<"/shows/[showId]/edit">) {
  const { showId } = await params;
  return <EditShow showId={showId} />;
}
