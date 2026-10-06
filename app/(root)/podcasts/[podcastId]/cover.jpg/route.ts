import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { directoryCoverResponse } from "@/lib/feed/cover";
import { notFound, unavailable } from "@/lib/feed/http";

// An episode's own cover (none = it uses its show's, which the feed lists).
export async function GET(
  _request: Request,
  ctx: RouteContext<"/podcasts/[podcastId]/cover.jpg">,
) {
  const { podcastId } = await ctx.params;
  const podcast = await fetchQuery(api.podcasts.getById, { podcastId }).catch(
    () => undefined,
  );
  if (podcast === undefined) return unavailable();
  if (!podcast?.imageSource || !podcast.imageUrl) {
    return notFound("Portada no encontrada");
  }
  return await directoryCoverResponse(podcast.imageUrl);
}
