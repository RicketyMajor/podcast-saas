import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./lib/auth";

// Manual cover uploads: the client POSTs the file to this short-lived URL.
// Type and size are checked in the client and again when the podcast is
// created (phase 7), through the `_storage` system table.
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getCurrentUserOrThrow(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
