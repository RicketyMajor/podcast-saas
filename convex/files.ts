import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";

import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./lib/auth";

// Each URL accepts one file of any size; the cron only removes unpublished
// ones after 24 h, so cap how fast a single account can fill storage.
const uploadLimits = new RateLimiter(components.rateLimiter, {
  uploadUrl: { kind: "token bucket", rate: 20, period: HOUR },
});

// Manual cover uploads: the client POSTs the file to this short-lived URL.
// Type and size are checked in the client and again when the podcast is
// created (phase 7), through the `_storage` system table.
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const { ok } = await uploadLimits.limit(ctx, "uploadUrl", {
      key: user._id,
    });
    if (!ok) {
      throw new ConvexError({
        code: "QUOTA_EXCEEDED",
        message: "Subiste muchas imágenes seguidas. Inténtalo en un rato.",
      });
    }
    return await ctx.storage.generateUploadUrl();
  },
});
