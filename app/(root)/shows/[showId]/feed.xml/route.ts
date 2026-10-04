import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { cached, notFound, unavailable } from "@/lib/feed/http";
import { buildFeed } from "@/lib/feed/rss";

export async function GET(
  request: Request,
  ctx: RouteContext<"/shows/[showId]/feed.xml">,
) {
  const { showId } = await ctx.params;
  const feed = await fetchQuery(api.shows.getFeed, { showId }).catch(
    () => undefined,
  );
  if (feed === undefined) return unavailable();
  if (feed === null) return notFound("Feed no encontrado");
  return cached(
    buildFeed(feed, new URL(request.url).origin),
    "application/rss+xml; charset=utf-8",
  );
}
