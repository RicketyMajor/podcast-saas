import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";

import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { authorNameOf } from "./lib/auth";
import { searchTextOf } from "./lib/text";

// Every account brings its own daily AI quota, so mass sign-ups could drain
// the global monthly TTS cap. ponytail: one global bucket, so a burst also
// blocks real people for a while; per-IP needs an HTTP action in front.
const signUpLimits = new RateLimiter(components.rateLimiter, {
  signUp: { kind: "token bucket", rate: 30, period: HOUR },
});

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
        // Throwing here rolls back the new account (same transaction).
        const { ok } = await signUpLimits.limit(ctx, "signUp");
        if (!ok) {
          throw new ConvexError({
            code: "QUOTA_EXCEEDED",
            message:
              "Hay muchos registros en este momento. Inténtalo en un rato.",
          });
        }
        await ctx.db.patch("users", userId, { podcastCount: 0, totalViews: 0 });
        return;
      }
      // Google refreshes name and avatar on every sign-in: copy them to the
      // denormalized fields of the user's shows and podcasts when they changed.
      const user = await ctx.db.get("users", userId);
      if (user === null) return;
      const authorName = authorNameOf(user);
      const authorImageUrl = user.image ?? "";
      const showTitles = new Map<Id<"shows">, string>();
      for await (const show of ctx.db
        .query("shows")
        .withIndex("by_author", (q) => q.eq("authorId", userId))) {
        showTitles.set(show._id, show.title);
        if (show.authorName === authorName) continue;
        await ctx.db.patch("shows", show._id, {
          authorName,
          searchText: searchTextOf(show.title, authorName),
        });
      }
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
          searchText: searchTextOf(
            podcast.title,
            authorName,
            showTitles.get(podcast.showId),
          ),
        });
      }
    },
  },
});
