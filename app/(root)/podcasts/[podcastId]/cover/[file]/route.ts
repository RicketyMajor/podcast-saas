import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { directoryCoverResponse } from "@/lib/feed/cover";
import { notFound, unavailable } from "@/lib/feed/http";
import { versionOf } from "@/lib/feed/rss";

// An episode's own cover, current version only (none = it uses its show's,
// which the feed lists).
export async function GET(
  _request: Request,
  ctx: RouteContext<"/podcasts/[podcastId]/cover/[file]">,
) {
  const { podcastId, file } = await ctx.params;
  const podcast = await fetchQuery(api.podcasts.getById, { podcastId }).catch(
    () => undefined,
  );
  if (podcast === undefined) return unavailable();
  if (
    !podcast?.imageStorageId ||
    !podcast.imageUrl ||
    versionOf(file, ".jpg") !== podcast.imageStorageId
  ) {
    return notFound("Portada no encontrada");
  }
  return await directoryCoverResponse(podcast.imageUrl);
}
