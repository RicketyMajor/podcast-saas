import { v } from "convex/values";

import { query } from "./_generated/server";
import { authorNameOf, avatarUrlOf, getCurrentUser } from "./lib/auth";
import { clampLimit } from "./lib/limits";

// The uploaded photo, else Google's, else null (initial).
const avatarUrl = v.union(v.string(), v.null());

// Public shape: never expose email or other private fields.
export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      name: v.string(),
      avatarUrl,
      podcastCount: v.number(),
      totalViews: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) return null;
    return {
      _id: user._id,
      name: authorNameOf(user),
      avatarUrl: await avatarUrlOf(ctx, user),
      podcastCount: user.podcastCount ?? 0,
      totalViews: user.totalViews ?? 0,
    };
  },
});

export const getById = query({
  // A string, so a malformed id in the URL reads as "doesn't exist".
  args: { profileId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      name: v.string(),
      avatarUrl,
      bio: v.union(v.string(), v.null()),
      website: v.union(v.string(), v.null()),
      podcastCount: v.number(),
      totalViews: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = ctx.db.normalizeId("users", args.profileId);
    const user = userId && (await ctx.db.get("users", userId));
    if (!user) return null;
    return {
      _id: user._id,
      name: authorNameOf(user),
      avatarUrl: await avatarUrlOf(ctx, user),
      bio: user.bio ?? null,
      website: user.website ?? null,
      podcastCount: user.podcastCount ?? 0,
      totalViews: user.totalViews ?? 0,
    };
  },
});

export const getTopCreators = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      avatarUrl,
      podcastCount: v.number(),
    }),
  ),
  handler: async (ctx, { limit }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_podcast_count", (q) => q.gt("podcastCount", 0))
      .order("desc")
      .take(clampLimit(limit, 5, 20));
    return await Promise.all(
      users.map(async (user) => ({
        _id: user._id,
        name: authorNameOf(user),
        avatarUrl: await avatarUrlOf(ctx, user),
        podcastCount: user.podcastCount ?? 0,
      })),
    );
  },
});
