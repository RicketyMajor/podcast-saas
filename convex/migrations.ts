import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { DEFAULT_SHOW_CATEGORY, TITLE_MAX_CHARS } from "./lib/limits";
import { searchTextOf } from "./lib/text";

/**
 * Phase 17 (ADR-029): gives every episode without a show one show per author.
 * The show takes the cover of the author's newest episode, which then inherits
 * it back, so no card changes and no file is copied. Idempotent: a re-run finds
 * nothing to do. Run with `npx convex run migrations:backfillShows`
 * (`'{"dryRun": true}'` only counts).
 */
export const backfillShows = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  returns: v.object({ shows: v.number(), episodes: v.number() }),
  handler: async (ctx, { dryRun }) => {
    // ponytail: one batch of 500; run again until it reports 0 (MVP data is
    // a few dozen episodes).
    const loose = await ctx.db
      .query("podcasts")
      .withIndex("by_show", (q) => q.eq("showId", undefined))
      .take(500);

    const byAuthor = new Map<Id<"users">, Doc<"podcasts">[]>();
    for (const podcast of loose) {
      byAuthor.set(podcast.authorId, [
        ...(byAuthor.get(podcast.authorId) ?? []),
        podcast,
      ]);
    }
    if (dryRun) return { shows: byAuthor.size, episodes: loose.length };

    for (const episodes of byAuthor.values()) {
      episodes.sort((a, b) => b._creationTime - a._creationTime);
      // Before this migration every episode had its own cover.
      const coverEpisode = episodes.find((e) => e.imageStorageId)!;
      const authorName = episodes[0]!.authorName;
      const title = `Podcasts de ${authorName}`.slice(0, TITLE_MAX_CHARS);
      const showId = await ctx.db.insert("shows", {
        authorId: episodes[0]!.authorId,
        authorName,
        title,
        description: `Episodios de ${authorName} en Waves.`,
        languageCode: episodes[0]!.languageCode,
        category: DEFAULT_SHOW_CATEGORY,
        explicit: false,
        imageStorageId: coverEpisode.imageStorageId!,
        imageSource: coverEpisode.imageSource ?? "upload",
        imagePrompt: coverEpisode.imagePrompt,
        episodeCount: episodes.length,
        totalViews: episodes.reduce((sum, e) => sum + e.views, 0),
        searchText: searchTextOf(title, authorName),
      });
      for (const episode of episodes) {
        await ctx.db.patch("podcasts", episode._id, {
          showId,
          searchText: searchTextOf(episode.title, episode.authorName, title),
          ...(episode._id === coverEpisode._id && {
            imageStorageId: undefined,
            imageSource: undefined,
            imagePrompt: undefined,
          }),
        });
      }
    }
    console.log(
      `backfillShows: ${byAuthor.size} show(s), ${loose.length} episode(s)`,
    );
    return { shows: byAuthor.size, episodes: loose.length };
  },
});
