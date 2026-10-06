import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { notFound, redirect, unavailable } from "@/lib/feed/http";

// A feed URL that ends in .mp3; the file itself still comes from Convex.
export async function GET(
  _request: Request,
  ctx: RouteContext<"/podcasts/[podcastId]/audio.mp3">,
) {
  const { podcastId } = await ctx.params;
  const podcast = await fetchQuery(api.podcasts.getById, { podcastId }).catch(
    () => undefined,
  );
  if (podcast === undefined) return unavailable();
  if (!podcast?.audioUrl) return notFound("Audio no encontrado");
  return redirect(podcast.audioUrl);
}
