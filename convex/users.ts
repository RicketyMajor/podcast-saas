import { v } from "convex/values";

import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

// Public shape: never expose email or other private fields.
export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      podcastCount: v.number(),
      totalViews: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) return null;
    return {
      _id: user._id,
      name: user.name,
      image: user.image,
      podcastCount: user.podcastCount ?? 0,
      totalViews: user.totalViews ?? 0,
    };
  },
});
