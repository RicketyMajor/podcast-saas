import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";

import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
  authorNameOf,
  avatarUrlOf,
  getCurrentUser,
  getCurrentUserOrThrow,
  syncAuthorFields,
} from "./lib/auth";
import { freshUpload, generationOf } from "./lib/covers";
import { clampLimit } from "./lib/limits";
import { cleanProfile, profileError } from "./lib/profile";
import { invalid } from "./lib/validation";

// A name change rewrites every show and episode of its author.
const profileLimits = new RateLimiter(components.rateLimiter, {
  profileUpdate: { kind: "token bucket", rate: 10, period: HOUR },
});

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

// The settings form: the editable values, only for their owner.
export const getSettings = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      displayName: v.string(), // "" = they use their account's name
      accountName: v.string(), // the sign-up or Google name ("" if none)
      bio: v.string(),
      website: v.string(),
      avatarUrl, // the photo they uploaded
      accountImageUrl: avatarUrl, // Google's, used when there's none
    }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) return null;
    return {
      _id: user._id,
      displayName: user.displayName ?? "",
      accountName: user.name?.trim() ?? "",
      bio: user.bio ?? "",
      website: user.website ?? "",
      avatarUrl: user.avatarStorageId
        ? await ctx.storage.getUrl(user.avatarStorageId)
        : null,
      accountImageUrl: user.image ?? null,
    };
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.string(),
    bio: v.string(),
    website: v.string(),
    // Keep the current photo, remove it, or use a newly uploaded file.
    avatar: v.union(v.literal("keep"), v.literal("remove"), v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const error = profileError(args);
    if (error) throw invalid(error);
    const fields = cleanProfile(args);

    const picked =
      args.avatar === "keep" || args.avatar === "remove" ? null : args.avatar;
    const newAvatar =
      picked !== null && picked !== user.avatarStorageId ? picked : null;
    // Only plain uploads: an AI file belongs to its generation (and its cron).
    if (
      newAvatar !== null &&
      ((await generationOf(ctx, newAvatar)) !== null ||
        !(await freshUpload(ctx, newAvatar)))
    ) {
      throw invalid("La foto no es válida. Sube una imagen PNG, JPG o WebP.");
    }

    const { ok } = await profileLimits.limit(ctx, "profileUpdate", {
      key: user._id,
    });
    if (!ok) {
      throw new ConvexError({
        code: "QUOTA_EXCEEDED",
        message:
          "Cambiaste tu perfil muchas veces seguidas. Inténtalo en un rato.",
      });
    }

    const avatarStorageId =
      args.avatar === "remove"
        ? undefined
        : (newAvatar ?? user.avatarStorageId);
    // Blank = use the account's name (and follow it when Google changes it).
    const displayName = fields.displayName || undefined;
    await ctx.db.patch("users", user._id, {
      displayName,
      bio: fields.bio || undefined,
      website: fields.website || undefined,
      avatarStorageId,
    });

    const updated = { ...user, displayName };
    if (authorNameOf(updated) !== authorNameOf(user)) {
      await syncAuthorFields(ctx, updated);
    }
    if (user.avatarStorageId && user.avatarStorageId !== avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
    }
    return null;
  },
});
