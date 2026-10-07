import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { LANGUAGES } from "./ai/voices";
import {
  assertOwner,
  authorNameOf,
  avatarUrlOf,
  getCurrentUser,
  getCurrentUserOrThrow,
} from "./lib/auth";
import { checkCover, markConsumed, promptOf } from "./lib/covers";
import {
  clampLimit,
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MIN_CHARS,
  MAX_SHOWS_PER_USER,
  SHOW_CATEGORIES,
  TITLE_MAX_CHARS,
  TITLE_MIN_CHARS,
} from "./lib/limits";
import { normalizeSearchText, searchTextOf } from "./lib/text";
import {
  hostsResult,
  invalid,
  optionalEmail,
  publicHosts,
  text,
} from "./lib/validation";

// The "Shows" section above the episode results.
const SHOW_SEARCH_RESULTS = 6;

// What lists, cards and the create form's show picker need.
const showCard = v.object({
  _id: v.id("shows"),
  _creationTime: v.number(),
  title: v.string(),
  authorId: v.id("users"),
  authorName: v.string(),
  languageCode: v.string(),
  episodeCount: v.number(),
  imageUrl: v.union(v.string(), v.null()),
});

async function toCard(ctx: QueryCtx, show: Doc<"shows">) {
  return {
    _id: show._id,
    _creationTime: show._creationTime,
    title: show.title,
    authorId: show.authorId,
    authorName: show.authorName,
    languageCode: show.languageCode,
    episodeCount: show.episodeCount,
    imageUrl: await ctx.storage.getUrl(show.imageStorageId),
  };
}

const showDetail = v.object({
  ...showCard.fields,
  authorImageUrl: v.union(v.string(), v.null()),
  description: v.string(),
  category: v.string(),
  explicit: v.boolean(),
  totalViews: v.number(),
  imageSource: v.union(v.literal("ai"), v.literal("upload")),
  imagePrompt: v.optional(v.string()),
  imageStorageId: v.id("_storage"), // versions the directory cover URL
});

export const getById = query({
  // A string, so a malformed id in the URL reads as "doesn't exist".
  args: { showId: v.string() },
  returns: v.union(showDetail, v.null()),
  handler: async (ctx, args) => {
    const showId = ctx.db.normalizeId("shows", args.showId);
    const show = showId && (await ctx.db.get("shows", showId));
    if (!show) return null;
    const author = await ctx.db.get("users", show.authorId);
    return {
      ...(await toCard(ctx, show)),
      authorImageUrl: author ? await avatarUrlOf(ctx, author) : null,
      description: show.description,
      category: show.category,
      explicit: show.explicit,
      totalViews: show.totalViews,
      imageSource: show.imageSource,
      imagePrompt: show.imagePrompt,
      imageStorageId: show.imageStorageId,
    };
  },
});

// The "Publica en Apple Podcasts y Spotify" panel and the edit form: only
// the author sees the email (the feed shows it on purpose).
export const getDirectoryStatus = query({
  args: { showId: v.string() },
  returns: v.union(
    v.object({
      email: v.union(v.string(), v.null()),
      withoutDisclosure: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const showId = ctx.db.normalizeId("shows", args.showId);
    const show = showId && (await ctx.db.get("shows", showId));
    if (!user || !show || show.authorId !== user._id) return null;
    // ponytail: newest 100, the same episodes the feed lists; re-read on
    // every view of them, like getByShow on the same page. A per-show counter
    // kept by create/update/remove would avoid it if shows grow large.
    const episodes = await ctx.db
      .query("podcasts")
      .withIndex("by_show", (q) => q.eq("showId", show._id))
      .order("desc")
      .take(100);
    return {
      email: show.directoryEmail ?? null,
      withoutDisclosure: episodes.filter((p) => !p.spokenDisclosure).length,
    };
  },
});

// Complete for every author: create caps shows per user at the same number.
export const getByAuthor = query({
  args: { authorId: v.id("users") },
  returns: v.array(showCard),
  handler: async (ctx, { authorId }) => {
    const shows = await ctx.db
      .query("shows")
      .withIndex("by_author", (q) => q.eq("authorId", authorId))
      .order("desc")
      .take(MAX_SHOWS_PER_USER);
    return await Promise.all(shows.map((show) => toCard(ctx, show)));
  },
});

// An empty show has nothing to play: discovery lists skip it. Both lists
// read 2× what they return and drop the empties.
// ponytail: an empty show has 0 views (moving or deleting episodes takes
// their views along), so it can only crowd out shows that were never played
// (ties at 0 come newest first) or, in search, weaker matches. A flood of new
// empty shows can leave a row short; the fix is a `listed` flag kept by the
// episode mutations, indexed with totalViews and as a search filterField.
async function listedCards(
  ctx: QueryCtx,
  shows: Doc<"shows">[],
  limit: number,
) {
  return await Promise.all(
    shows
      .filter((show) => show.episodeCount > 0)
      .slice(0, limit)
      .map((show) => toCard(ctx, show)),
  );
}

export const getPopular = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(showCard),
  handler: async (ctx, { limit }) => {
    const take = clampLimit(limit, 8, 50);
    const shows = await ctx.db
      .query("shows")
      .withIndex("by_views")
      .order("desc")
      .take(take * 2);
    return await listedCards(ctx, shows, take);
  },
});

// searchText = normalized title + author.
export const search = query({
  args: { query: v.string() },
  returns: v.array(showCard),
  handler: async (ctx, args) => {
    const query = normalizeSearchText(args.query.slice(0, 100));
    if (query === "") return [];
    const shows = await ctx.db
      .query("shows")
      .withSearchIndex("search_text", (q) => q.search("searchText", query))
      .take(SHOW_SEARCH_RESULTS * 2);
    return await listedCards(ctx, shows, SHOW_SEARCH_RESULTS);
  },
});

const feedEpisode = v.object({
  _id: v.id("podcasts"),
  _creationTime: v.number(),
  title: v.string(),
  description: v.string(),
  transcript: v.string(),
  languageCode: v.string(),
  audioDurationSec: v.number(),
  audioStorageId: v.id("_storage"),
  audioSize: v.number(),
  audioType: v.string(),
  imageStorageId: v.union(v.id("_storage"), v.null()), // null = show's cover
  spokenDisclosure: v.boolean(),
  hosts: hostsResult, // null = one-voice narration
});

// What a podcast app needs (RSS, phase 19): only data the show and detail
// pages already make public, plus the directory email its author chose to
// publish (phase 20). No episodes, no feed: like discovery.
export const getFeed = query({
  args: { showId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("shows"),
      title: v.string(),
      description: v.string(),
      authorName: v.string(),
      languageCode: v.string(),
      category: v.string(),
      explicit: v.boolean(),
      directoryEmail: v.union(v.string(), v.null()),
      imageStorageId: v.id("_storage"),
      episodes: v.array(feedEpisode),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const showId = ctx.db.normalizeId("shows", args.showId);
    const show = showId && (await ctx.db.get("shows", showId));
    if (!show || show.episodeCount === 0) return null;
    // ponytail: newest 100, like getByShow; page the feed past that.
    const podcasts = await ctx.db
      .query("podcasts")
      .withIndex("by_show", (q) => q.eq("showId", show._id))
      .order("desc")
      .take(100);
    const episodes = await Promise.all(
      podcasts.map(async (p) => {
        const file = await ctx.db.system.get("_storage", p.audioStorageId);
        // An item without its audio breaks podcast apps: leave it out.
        if (!file) return null;
        return {
          _id: p._id,
          _creationTime: p._creationTime,
          title: p.title,
          description: p.description,
          transcript: p.transcript,
          languageCode: p.languageCode,
          audioDurationSec: p.audioDurationSec,
          audioStorageId: p.audioStorageId,
          audioSize: file.size,
          audioType: file.contentType ?? "audio/mpeg", // all Waves audio is MP3
          imageStorageId: p.imageStorageId ?? null,
          spokenDisclosure: p.spokenDisclosure === true,
          hosts: publicHosts(p.hosts),
        };
      }),
    );
    const listed = episodes.filter((episode) => episode !== null);
    if (listed.length === 0) return null;
    return {
      _id: show._id,
      title: show.title,
      description: show.description,
      authorName: show.authorName,
      languageCode: show.languageCode,
      category: show.category,
      explicit: show.explicit,
      directoryEmail: show.directoryEmail ?? null,
      imageStorageId: show.imageStorageId,
      episodes: listed,
    };
  },
});

/** The show, if it exists and the current user is its author. */
export async function getOwnShow(
  ctx: MutationCtx,
  user: Doc<"users">,
  showId: Id<"shows">,
) {
  const show = await ctx.db.get("shows", showId);
  if (show === null) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Este show no existe o fue eliminado.",
    });
  }
  assertOwner(show, user);
  return show;
}

// Editable fields, shared by create and update.
const showFields = {
  title: v.string(),
  description: v.string(),
  languageCode: v.string(),
  category: v.string(),
  explicit: v.boolean(),
  imagePrompt: v.optional(v.string()),
  directoryEmail: v.optional(v.string()),
};

function checkFields(args: {
  title: string;
  description: string;
  languageCode: string;
  category: string;
}) {
  if (!LANGUAGES.some((l) => l.code === args.languageCode)) {
    throw invalid("Idioma no disponible.");
  }
  if (!SHOW_CATEGORIES.some((c) => c.value === args.category)) {
    throw invalid("Categoría no disponible.");
  }
  return {
    title: text(args.title, "El título", TITLE_MIN_CHARS, TITLE_MAX_CHARS),
    description: text(
      args.description,
      "La descripción",
      DESCRIPTION_MIN_CHARS,
      DESCRIPTION_MAX_CHARS,
    ),
  };
}

export const create = mutation({
  args: { ...showFields, imageStorageId: v.id("_storage") },
  returns: v.id("shows"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const own = await ctx.db
      .query("shows")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .take(MAX_SHOWS_PER_USER);
    if (own.length >= MAX_SHOWS_PER_USER) {
      throw invalid(`Puedes tener hasta ${MAX_SHOWS_PER_USER} shows.`);
    }
    const fields = checkFields(args);
    const directoryEmail = optionalEmail(args.directoryEmail);
    const cover = await checkCover(ctx, user._id, args.imageStorageId);

    const authorName = authorNameOf(user);
    const showId = await ctx.db.insert("shows", {
      ...fields,
      authorId: user._id,
      authorName,
      languageCode: args.languageCode,
      category: args.category,
      explicit: args.explicit,
      ...(directoryEmail && { directoryEmail }),
      imageStorageId: args.imageStorageId,
      imageSource: cover.imageSource,
      imagePrompt: promptOf(cover.imageSource, args.imagePrompt),
      episodeCount: 0,
      totalViews: 0,
      searchText: searchTextOf(fields.title, authorName),
    });
    await markConsumed(ctx, cover.generation);
    return showId;
  },
});

// An omitted (or unchanged) cover keeps the current file; a new one goes
// through the same checks as create and the old file is deleted.
export const update = mutation({
  args: {
    showId: v.id("shows"),
    ...showFields,
    imageStorageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const show = await getOwnShow(ctx, user, args.showId);
    const fields = checkFields(args);
    const newCover =
      args.imageStorageId !== undefined &&
      args.imageStorageId !== show.imageStorageId
        ? await checkCover(ctx, user._id, args.imageStorageId)
        : null;

    await ctx.db.patch("shows", show._id, {
      ...fields,
      languageCode: args.languageCode,
      category: args.category,
      explicit: args.explicit,
      // Absent = keep (an older client); "" = remove.
      directoryEmail:
        args.directoryEmail === undefined
          ? show.directoryEmail
          : optionalEmail(args.directoryEmail),
      searchText: searchTextOf(fields.title, show.authorName),
      ...(newCover
        ? {
            imageStorageId: args.imageStorageId,
            imageSource: newCover.imageSource,
            imagePrompt: promptOf(newCover.imageSource, args.imagePrompt),
          }
        : {}),
    });

    // Episodes are found by their show's title too.
    // ponytail: one write per episode; batch with the scheduler if shows
    // grow past a few hundred episodes.
    if (fields.title !== show.title) {
      for await (const podcast of ctx.db
        .query("podcasts")
        .withIndex("by_show", (q) => q.eq("showId", show._id))) {
        await ctx.db.patch("podcasts", podcast._id, {
          searchText: searchTextOf(
            podcast.title,
            podcast.authorName,
            fields.title,
          ),
        });
      }
    }

    if (newCover) {
      await markConsumed(ctx, newCover.generation);
      await ctx.storage.delete(show.imageStorageId);
    }
    return null;
  },
});

// Only an empty show can go: deleting episodes is one decision at a time.
export const remove = mutation({
  args: { showId: v.id("shows") },
  returns: v.null(),
  handler: async (ctx, { showId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const show = await getOwnShow(ctx, user, showId);
    const episode = await ctx.db
      .query("podcasts")
      .withIndex("by_show", (q) => q.eq("showId", showId))
      .first();
    if (episode !== null) {
      throw invalid(
        "Este show todavía tiene episodios. Muévelos o bórralos primero.",
      );
    }
    await ctx.db.delete("shows", showId);
    await ctx.storage.delete(show.imageStorageId);
    return null;
  },
});
