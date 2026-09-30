import { ConvexError, v } from "convex/values";

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
