import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { directoryCoverResponse } from "@/lib/feed/cover";
import { notFound, unavailable } from "@/lib/feed/http";

// The show's cover as Apple Podcasts and Spotify want it (lib/feed/cover.ts).
export async function GET(
  _request: Request,
  ctx: RouteContext<"/shows/[showId]/cover.jpg">,
) {
  const { showId } = await ctx.params;
  const show = await fetchQuery(api.shows.getById, { showId }).catch(
    () => undefined,
  );
  if (show === undefined) return unavailable();
  if (!show?.imageUrl) return notFound("Portada no encontrada");
  return await directoryCoverResponse(show.imageUrl);
}
