import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";
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

export function assertOwner(podcast: Doc<"podcasts">, user: Doc<"users">) {
  if (podcast.authorId !== user._id) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "No tienes permiso para modificar este podcast.",
    });
  }
}
