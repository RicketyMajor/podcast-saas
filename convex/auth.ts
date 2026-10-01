import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import type { DataModel } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { authorNameOf } from "./lib/auth";
import { normalizeSearchText } from "./lib/text";

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 60;

// ponytail: Password's own errors ("Invalid credentials", "Account … already exists")
// are plain Errors, redacted in production; the client maps any failure to a generic
// Spanish message per flow. Rewrite on ConvexCredentials if we need exact codes.
const password = Password<DataModel>({
  profile(params) {
    const email = String(params.email ?? "")
      .trim()
      .toLowerCase();
    if (params.flow !== "signUp") return { email };

    const name = String(params.name ?? "").trim();
    if (!name || name.length > MAX_NAME_LENGTH) {
      throw new ConvexError({
        code: "VALIDATION",
        message: `Escribe tu nombre (máximo ${MAX_NAME_LENGTH} caracteres).`,
      });
    }
    return { email, name };
  },
  validatePasswordRequirements(password) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ConvexError({
        code: "VALIDATION",
        message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      });
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, password],
  callbacks: {
    async afterUserCreatedOrUpdated(genericCtx, { userId, existingUserId }) {
      // The library types ctx with an untyped data model; ours matches it.
      const ctx = genericCtx as unknown as MutationCtx;
      if (existingUserId === null) {
        await ctx.db.patch("users", userId, { podcastCount: 0, totalViews: 0 });
        return;
      }
      // Google refreshes name and avatar on every sign-in: copy them to the
      // denormalized fields of the user's podcasts when they changed.
      const user = await ctx.db.get("users", userId);
      if (user === null) return;
      const authorName = authorNameOf(user);
      const authorImageUrl = user.image ?? "";
      for await (const podcast of ctx.db
        .query("podcasts")
        .withIndex("by_author", (q) => q.eq("authorId", userId))) {
        if (
          podcast.authorName === authorName &&
          podcast.authorImageUrl === authorImageUrl
        ) {
          continue;
        }
        await ctx.db.patch("podcasts", podcast._id, {
          authorName,
          authorImageUrl,
          searchText: normalizeSearchText(`${podcast.title} ${authorName}`),
        });
      }
    },
  },
});
