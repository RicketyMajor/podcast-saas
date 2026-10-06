import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { cached, notFound, unavailable } from "@/lib/feed/http";
import { voicedText } from "@/lib/feed/rss";
import { estimateCues, toVtt } from "@/lib/feed/vtt";

// Captions with estimated timings (RSS podcast:transcript, text/vtt).
export async function GET(
  _request: Request,
  ctx: RouteContext<"/podcasts/[podcastId]/transcript.vtt">,
) {
  const { podcastId } = await ctx.params;
  const podcast = await fetchQuery(api.podcasts.getById, { podcastId }).catch(
    () => undefined,
  );
  if (podcast === undefined) return unavailable();
  if (podcast === null) return notFound("Transcripción no encontrada");
  return cached(
    toVtt(
      estimateCues(
        voicedText(
          podcast.transcript,
          podcast.languageCode,
          podcast.spokenDisclosure,
        ),
        podcast.audioDurationSec,
      ),
    ),
    "text/vtt; charset=utf-8",
  );
}
