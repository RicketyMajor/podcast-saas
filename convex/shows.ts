import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { LANGUAGES } from "./ai/voices";
import { assertOwner, authorNameOf, getCurrentUserOrThrow } from "./lib/auth";
import { checkCover, markConsumed, promptOf } from "./lib/covers";
import {
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MIN_CHARS,
  MAX_SHOWS_PER_USER,
  SHOW_CATEGORIES,
  TITLE_MAX_CHARS,
  TITLE_MIN_CHARS,
} from "./lib/limits";
import { searchTextOf } from "./lib/text";
import { invalid, text } from "./lib/validation";

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
  authorImageUrl: v.string(),
  description: v.string(),
  category: v.string(),
  explicit: v.boolean(),
  totalViews: v.number(),
  imageSource: v.union(v.literal("ai"), v.literal("upload")),
  imagePrompt: v.optional(v.string()),
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
      authorImageUrl: author?.image ?? "",
      description: show.description,
      category: show.category,
      explicit: show.explicit,
      totalViews: show.totalViews,
      imageSource: show.imageSource,
      imagePrompt: show.imagePrompt,
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
    const cover = await checkCover(ctx, user._id, args.imageStorageId);

    const authorName = authorNameOf(user);
    const showId = await ctx.db.insert("shows", {
      ...fields,
      authorId: user._id,
      authorName,
      languageCode: args.languageCode,
      category: args.category,
      explicit: args.explicit,
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
