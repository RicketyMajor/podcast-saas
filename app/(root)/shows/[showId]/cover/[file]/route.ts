import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { directoryCoverResponse } from "@/lib/feed/cover";
import { notFound, unavailable } from "@/lib/feed/http";
import { versionOf } from "@/lib/feed/rss";

// The show's cover as Apple Podcasts and Spotify want it (lib/feed/cover.ts),
// at /shows/<id>/cover/<storageId>.jpg: only the current file is served.
export async function GET(
  _request: Request,
  ctx: RouteContext<"/shows/[showId]/cover/[file]">,
) {
  const { showId, file } = await ctx.params;
  const show = await fetchQuery(api.shows.getById, { showId }).catch(
    () => undefined,
  );
  if (show === undefined) return unavailable();
  if (!show?.imageUrl || versionOf(file, ".jpg") !== show.imageStorageId) {
    return notFound("Portada no encontrada");
  }
  return await directoryCoverResponse(show.imageUrl);
}
