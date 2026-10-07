import { getAuthUserId } from "@convex-dev/auth/server";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
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
import { blockOf, followOf, hiddenAuthorIds } from "./lib/social";
import { invalid } from "./lib/validation";

// A name change rewrites every show and episode of its author; a follow or
// block writes two counters.
const userLimits = new RateLimiter(components.rateLimiter, {
  profileUpdate: { kind: "token bucket", rate: 10, period: HOUR },
  social: { kind: "token bucket", rate: 60, period: HOUR },
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
      followerCount: v.number(),
      followingCount: v.number(),
      following: v.boolean(), // false signed out or on your own profile
      blockedByMe: v.boolean(), // the page shows only "Desbloquear"
    }),
  ),
  handler: async (ctx, args) => {
    const userId = ctx.db.normalizeId("users", args.profileId);
    const user = userId && (await ctx.db.get("users", userId));
    if (!user) return null;

    const relation = { following: false, blockedByMe: false };
    const me = await getAuthUserId(ctx);
    if (me !== null && me !== user._id) {
      const [blockedMe, blockedByMe, following] = await Promise.all([
        blockOf(ctx, user._id, me),
        blockOf(ctx, me, user._id),
        followOf(ctx, me, user._id),
      ]);
      // Blocked by them: the profile doesn't exist, with no hint of why.
      if (blockedMe !== null) return null;
      relation.blockedByMe = blockedByMe !== null;
      relation.following = following !== null;
    }
    return {
      _id: user._id,
      name: authorNameOf(user),
      avatarUrl: await avatarUrlOf(ctx, user),
      bio: user.bio ?? null,
      website: user.website ?? null,
      podcastCount: user.podcastCount ?? 0,
      totalViews: user.totalViews ?? 0,
      followerCount: user.followerCount ?? 0,
      followingCount: user.followingCount ?? 0,
      ...relation,
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

const userRow = v.object({ _id: v.id("users"), name: v.string(), avatarUrl });
// The followers dialog and Ajustes load 20 accounts at a time.
const USER_PAGE_MAX = 20;
const EMPTY_PAGE = { page: [], isDone: true, continueCursor: "" };

function checkPageSize(numItems: number) {
  if (numItems > USER_PAGE_MAX) {
    throw invalid(`Pide hasta ${USER_PAGE_MAX} cuentas por página.`);
  }
}

/** The visible accounts among `ids`, in order, as list rows. */
async function userRows(
  ctx: QueryCtx,
  ids: Id<"users">[],
  hidden: Set<Id<"users">>,
) {
  const users = await Promise.all(
    ids.filter((id) => !hidden.has(id)).map((id) => ctx.db.get("users", id)),
  );
  return await Promise.all(
    users
      .filter((user) => user !== null)
      .map(async (user) => ({
        _id: user._id,
        name: authorNameOf(user),
        avatarUrl: await avatarUrlOf(ctx, user),
      })),
  );
}

// Public, like the counters. Accounts hidden by a block drop out, so a page
// can come back shorter than asked (usePaginatedQuery copes).
export const getFollowers = query({
  args: { profileId: v.id("users"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(userRow),
  handler: async (ctx, { profileId, paginationOpts }) => {
    checkPageSize(paginationOpts.numItems);
    const hidden = await hiddenAuthorIds(ctx);
    if (hidden.has(profileId)) return EMPTY_PAGE;
    const result = await ctx.db
      .query("follows")
      .withIndex("by_followee", (q) => q.eq("followeeId", profileId))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: await userRows(
        ctx,
        result.page.map((f) => f.followerId),
        hidden,
      ),
    };
  },
});

export const getFollowing = query({
  args: { profileId: v.id("users"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(userRow),
  handler: async (ctx, { profileId, paginationOpts }) => {
    checkPageSize(paginationOpts.numItems);
    const hidden = await hiddenAuthorIds(ctx);
    if (hidden.has(profileId)) return EMPTY_PAGE;
    const result = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", profileId))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: await userRows(
        ctx,
        result.page.map((f) => f.followeeId),
        hidden,
      ),
    };
  },
});

// Ajustes → "Cuentas bloqueadas": only your own (ordered by account id).
export const getBlocked = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(userRow),
  handler: async (ctx, { paginationOpts }) => {
    checkPageSize(paginationOpts.numItems);
    const me = await getAuthUserId(ctx);
    if (me === null) return EMPTY_PAGE;
    const result = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (q) => q.eq("blockerId", me))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: await userRows(
        ctx,
        result.page.map((b) => b.blockedId),
        new Set(),
      ),
    };
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

    const { ok } = await userLimits.limit(ctx, "profileUpdate", {
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

/**
 * The signed-in user's id, once `otherId` is someone else who exists and the
 * hourly budget every follow and block action shares allows one more.
 */
async function socialActor(ctx: MutationCtx, otherId: Id<"users">) {
  const me = await getCurrentUserOrThrow(ctx);
  if (otherId === me._id) {
    throw invalid("No puedes hacer esto con tu propia cuenta.");
  }
  if ((await ctx.db.get("users", otherId)) === null) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Esta cuenta no existe.",
    });
  }
  const { ok } = await userLimits.limit(ctx, "social", { key: me._id });
  if (!ok) {
    throw new ConvexError({
      code: "QUOTA_EXCEEDED",
      message: "Hiciste muchos cambios seguidos. Inténtalo en un rato.",
    });
  }
  return me._id;
}

/** Adds (1) or takes off (-1) one follow on both users' counters. */
async function shiftFollowCounts(
  ctx: MutationCtx,
  followerId: Id<"users">,
  followeeId: Id<"users">,
  by: 1 | -1,
) {
  const [follower, followee] = await Promise.all([
    ctx.db.get("users", followerId),
    ctx.db.get("users", followeeId),
  ]);
  if (follower) {
    await ctx.db.patch("users", followerId, {
      followingCount: Math.max((follower.followingCount ?? 0) + by, 0),
    });
  }
  if (followee) {
    await ctx.db.patch("users", followeeId, {
      followerCount: Math.max((followee.followerCount ?? 0) + by, 0),
    });
  }
}

/** Deletes the follow from `followerId` to `followeeId`, if there is one. */
async function unlink(
  ctx: MutationCtx,
  followerId: Id<"users">,
  followeeId: Id<"users">,
) {
  const follow = await followOf(ctx, followerId, followeeId);
  if (follow === null) return;
  await ctx.db.delete("follows", follow._id);
  await shiftFollowCounts(ctx, followerId, followeeId, -1);
}

const otherUser = { userId: v.id("users") };

export const follow = mutation({
  args: otherUser,
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const me = await socialActor(ctx, userId);
    const [blocking, blockedBy] = await Promise.all([
      blockOf(ctx, me, userId),
      blockOf(ctx, userId, me),
    ]);
    // Same words both ways: never tells who blocked whom.
    if (blocking !== null || blockedBy !== null) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "No puedes seguir a esta cuenta.",
      });
    }
    if ((await followOf(ctx, me, userId)) !== null) return null;
    await ctx.db.insert("follows", { followerId: me, followeeId: userId });
    await shiftFollowCounts(ctx, me, userId, 1);
    return null;
  },
});

export const unfollow = mutation({
  args: otherUser,
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    await unlink(ctx, await socialActor(ctx, userId), userId);
    return null;
  },
});

// Removing isn't blocking: they can follow again.
export const removeFollower = mutation({
  args: otherUser,
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    await unlink(ctx, userId, await socialActor(ctx, userId));
    return null;
  },
});

// Cuts both follows and vetoes new ones; while signed in, neither sees the
// other's profile, shows or episodes (lib/social.ts).
export const block = mutation({
  args: otherUser,
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const me = await socialActor(ctx, userId);
    await unlink(ctx, me, userId);
    await unlink(ctx, userId, me);
    if ((await blockOf(ctx, me, userId)) === null) {
      await ctx.db.insert("blocks", { blockerId: me, blockedId: userId });
    }
    return null;
  },
});

// The follows a block cut don't come back.
export const unblock = mutation({
  args: otherUser,
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const block = await blockOf(ctx, await socialActor(ctx, userId), userId);
    if (block !== null) await ctx.db.delete("blocks", block._id);
    return null;
  },
});
