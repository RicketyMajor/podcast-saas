import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

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

/** Name shown on the user's podcasts (denormalized into `authorName`). */
export function authorNameOf(user: Doc<"users">) {
  return user.name?.trim() || "Anónimo";
}
