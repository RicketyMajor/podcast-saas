import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { syncAuthorFields } from "./lib/auth";
import { DISPLAY_NAME_MAX_CHARS } from "./lib/limits";

// Every account brings its own daily AI quota, so mass sign-ups could drain
// the global monthly TTS cap. ponytail: one global bucket, so a burst also
// blocks real people for a while; per-IP needs an HTTP action in front.
const signUpLimits = new RateLimiter(components.rateLimiter, {
  signUp: { kind: "token bucket", rate: 30, period: HOUR },
});

const MIN_PASSWORD_LENGTH = 8;

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
    if (!name || name.length > DISPLAY_NAME_MAX_CHARS) {
      throw new ConvexError({
        code: "VALIDATION",
        message: `Escribe tu nombre (máximo ${DISPLAY_NAME_MAX_CHARS} caracteres).`,
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
      // Google rewrites name and image on every sign-in; a name set in
      // Ajustes still wins (authorNameOf), so this only writes on a change.
      const user = await ctx.db.get("users", userId);
      if (user !== null) await syncAuthorFields(ctx, user);
    },
  },
});
