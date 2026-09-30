import { v } from "convex/values";

import { query } from "./_generated/server";
import schema from "./schema";

// Phase 7 adds resolved storage URLs; for now raw documents are enough.
export const getTrending = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(schema.doc("podcasts")),
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("podcasts")
      .withIndex("by_views")
      .order("desc")
      .take(Math.min(limit ?? 8, 50));
  },
});
