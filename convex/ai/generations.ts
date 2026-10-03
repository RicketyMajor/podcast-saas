import { ConvexError, v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import {
  DAILY_AUDIO_GENERATIONS,
  DAILY_IMAGE_GENERATIONS,
  DAILY_SCRIPT_GENERATIONS,
  GLOBAL_MONTHLY_TTS_CHARS,
} from "../lib/limits";

const DAY_MS = 24 * 60 * 60 * 1000;

const DAILY_LIMITS = {
  audio: DAILY_AUDIO_GENERATIONS,
  image: DAILY_IMAGE_GENERATIONS,
  script: DAILY_SCRIPT_GENERATIONS,
} as const;

const kind = v.union(
  v.literal("audio"),
  v.literal("image"),
  v.literal("script"),
);

/**
 * Checks quotas and reserves one generation in a single transaction, so two
 * concurrent requests can't both slip under the limit. Failed generations
 * don't count: providers don't bill them.
 */
export const reserveGeneration = internalMutation({
  args: {
    userId: v.id("users"),
    kind,
    provider: v.string(),
    model: v.string(),
    inputChars: v.number(),
    estimatedCostUsd: v.number(),
  },
  returns: v.id("aiGenerations"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Bounded by the daily limit itself (plus failures), so this stays small.
    let usedToday = 0;
    for await (const g of ctx.db
      .query("aiGenerations")
      .withIndex("by_user", (q) =>
        q.eq("userId", args.userId).gt("_creationTime", now - DAY_MS),
      )) {
      if (g.kind === args.kind && g.status !== "error") usedToday++;
    }
    if (usedToday >= DAILY_LIMITS[args.kind]) {
      throw new ConvexError({
        code: "QUOTA_EXCEEDED",
        message: "Alcanzaste el límite diario de generaciones. Vuelve mañana.",
      });
    }

    if (args.kind === "audio") {
      const date = new Date(now);
      const monthStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
      // ponytail: scans this month's audio rows (~hundreds at MVP scale);
      // switch to a monthly counter document if volume grows.
      let usedChars = 0;
      for await (const g of ctx.db
        .query("aiGenerations")
        .withIndex("by_kind", (q) =>
          q.eq("kind", "audio").gt("_creationTime", monthStart),
        )) {
        if (g.status !== "error") usedChars += g.inputChars;
      }
      if (usedChars + args.inputChars > GLOBAL_MONTHLY_TTS_CHARS) {
        throw new ConvexError({
          code: "QUOTA_EXCEEDED",
          message:
            "Waves alcanzó su límite mensual de generación de voz. Vuelve el próximo mes.",
        });
      }
    }

    return await ctx.db.insert("aiGenerations", {
      ...args,
      consumed: false,
      status: "pending",
    });
  },
});

/**
 * Daily cron: deletes files nobody published, created 24 h to 7 days ago.
 * A file is an orphan if its generation was never consumed, or if it has no
 * generation (an upload) and no podcast uses it as cover. The window keeps
 * each run small and survives a few missed runs. The generation row stays,
 * without its file, as cost history.
 */
export const cleanupOrphans = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  returns: v.array(v.id("_storage")),
  handler: async (ctx, { dryRun }) => {
    const now = Date.now();
    // ponytail: 500 files per run (~2 days of full quotas for 20 users);
    // reschedule itself with a cursor if the window gets bigger than that.
    const files = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) =>
        q
          .gt("_creationTime", now - 7 * DAY_MS)
          .lt("_creationTime", now - DAY_MS),
      )
      .take(500);

    const orphans: Id<"_storage">[] = [];
    for (const file of files) {
      const generation = await ctx.db
        .query("aiGenerations")
        .withIndex("by_storage", (q) => q.eq("storageId", file._id))
        .unique();
      const orphan = generation
        ? !generation.consumed
        : (await ctx.db
            .query("podcasts")
            .withIndex("by_image", (q) => q.eq("imageStorageId", file._id))
            .first()) === null;
      if (!orphan) continue;
      orphans.push(file._id);
      if (dryRun) continue;
      if (generation) {
        await ctx.db.patch("aiGenerations", generation._id, {
          storageId: undefined,
        });
      }
      await ctx.storage.delete(file._id);
    }
    if (orphans.length > 0) {
      console.log(`cleanupOrphans: ${orphans.length} file(s)`, { dryRun });
    }
    return orphans;
  },
});

export const finishGeneration = internalMutation({
  args: {
    generationId: v.id("aiGenerations"),
    outcome: v.union(
      v.object({
        status: v.literal("success"),
        storageId: v.optional(v.id("_storage")), // scripts have no file
        outputSeconds: v.optional(v.number()),
        // Set when the cost is only known after the call (token usage).
        estimatedCostUsd: v.optional(v.number()),
      }),
      v.object({
        status: v.literal("error"),
        errorMessage: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { generationId, outcome }) => {
    await ctx.db.patch(
      "aiGenerations",
      generationId,
      outcome.status === "error"
        ? { ...outcome, estimatedCostUsd: 0 }
        : outcome,
    );
    return null;
  },
});
