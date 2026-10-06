import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { notFound, redirect, unavailable } from "@/lib/feed/http";
import { versionOf } from "@/lib/feed/rss";

// /podcasts/<id>/audio/<storageId>.mp3: a feed URL that ends in .mp3 and
// names one file; the bytes still come from Convex. An old version (the
// audio was regenerated and deleted) is a 404, never the new file.
export async function GET(
  _request: Request,
  ctx: RouteContext<"/podcasts/[podcastId]/audio/[file]">,
) {
  const { podcastId, file } = await ctx.params;
  const podcast = await fetchQuery(api.podcasts.getById, { podcastId }).catch(
    () => undefined,
  );
  if (podcast === undefined) return unavailable();
  if (
    !podcast?.audioUrl ||
    versionOf(file, ".mp3") !== podcast.audioStorageId
  ) {
    return notFound("Audio no encontrado");
  }
  return redirect(podcast.audioUrl);
}
