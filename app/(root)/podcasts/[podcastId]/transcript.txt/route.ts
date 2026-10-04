import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { cached, notFound, unavailable } from "@/lib/feed/http";

// The script exactly as voiced (RSS podcast:transcript, text/plain).
export async function GET(
  _request: Request,
  ctx: RouteContext<"/podcasts/[podcastId]/transcript.txt">,
) {
  const { podcastId } = await ctx.params;
  const podcast = await fetchQuery(api.podcasts.getById, { podcastId }).catch(
    () => undefined,
  );
  if (podcast === undefined) return unavailable();
  if (podcast === null) return notFound("Transcripción no encontrada");
  return cached(
    podcast.transcript.replace(/\r\n?/g, "\n"),
    "text/plain; charset=utf-8",
  );
}
