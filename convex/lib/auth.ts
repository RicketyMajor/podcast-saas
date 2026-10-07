import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ANONYMOUS_NAME } from "./profile";
import { searchTextOf } from "./text";

// MutationCtx and ActionCtx-backed queries extend QueryCtx, so this covers both.
export async function getCurrentUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  return userId === null ? null : await ctx.db.get(userId);
}

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (user === null) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Inicia sesión para continuar.",
    });
  }
  return user;
}

/** Podcasts and shows: only their author may change them. */
export function assertOwner(
  doc: { authorId: Id<"users"> },
  user: Doc<"users">,
) {
  if (doc.authorId !== user._id) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "No tienes permiso para modificar este contenido.",
    });
  }
}

/** Name shown everywhere (denormalized into `authorName`): theirs, else the account's. */
export function authorNameOf(user: Doc<"users">) {
  return user.displayName?.trim() || user.name?.trim() || ANONYMOUS_NAME;
}

/** The photo they uploaded, else their provider's (Google), else null. */
export async function avatarUrlOf(ctx: QueryCtx, user: Doc<"users">) {
  if (user.avatarStorageId) {
    return await ctx.storage.getUrl(user.avatarStorageId);
  }
  return user.image ?? null;
}

/**
 * Copies the user's current name into their shows and podcasts (authorName
 * and searchText), skipping the ones already up to date.
 * ponytail: one write per show and episode in a single transaction; batch
 * with the scheduler if a creator gets past a few thousand episodes.
 */
export async function syncAuthorFields(ctx: MutationCtx, user: Doc<"users">) {
  const authorName = authorNameOf(user);
  const showTitles = new Map<Id<"shows">, string>();
  for await (const show of ctx.db
    .query("shows")
    .withIndex("by_author", (q) => q.eq("authorId", user._id))) {
    showTitles.set(show._id, show.title);
    if (show.authorName === authorName) continue;
    await ctx.db.patch("shows", show._id, {
      authorName,
      searchText: searchTextOf(show.title, authorName),
    });
  }
  for await (const podcast of ctx.db
    .query("podcasts")
    .withIndex("by_author", (q) => q.eq("authorId", user._id))) {
    if (podcast.authorName === authorName) continue;
    await ctx.db.patch("podcasts", podcast._id, {
      authorName,
      searchText: searchTextOf(
        podcast.title,
        authorName,
        showTitles.get(podcast.showId),
      ),
    });
  }
}
