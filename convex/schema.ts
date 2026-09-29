import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Phase 2 adds `...authTables` from @convex-dev/auth. `users` already mirrors
// the Convex Auth fields and indexes, so that change is additive.
export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Denormalized counters; optional because Convex Auth inserts the user.
    podcastCount: v.optional(v.number()),
    totalViews: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_podcast_count", ["podcastCount"]),

  podcasts: defineTable({
    authorId: v.id("users"),
    authorName: v.string(),
    authorImageUrl: v.string(),
    title: v.string(),
    description: v.string(),
    transcript: v.string(),
    languageCode: v.string(), // BCP-47, e.g. "es-US"
    voiceProvider: v.literal("google"),
    voiceId: v.string(), // e.g. "es-US-Chirp3-HD-<Voice>"
    speakingRate: v.optional(v.number()), // Chirp 3 HD pace, 0.25–2.0
    audioStorageId: v.id("_storage"),
    audioDurationSec: v.number(),
    imageStorageId: v.id("_storage"),
    imageSource: v.union(v.literal("ai"), v.literal("upload")),
    imagePrompt: v.optional(v.string()),
    views: v.number(),
    searchText: v.string(), // normalizeSearchText(`${title} ${authorName}`)
  })
    .index("by_author", ["authorId"])
    .index("by_views", ["views"])
    .index("by_language", ["languageCode"])
    .searchIndex("search_text", { searchField: "searchText" }),

  aiGenerations: defineTable({
    userId: v.id("users"),
    kind: v.union(v.literal("audio"), v.literal("image"), v.literal("script")),
    provider: v.string(),
    model: v.string(),
    inputChars: v.number(),
    outputSeconds: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    consumed: v.boolean(), // true once the file is attached to a podcast
    estimatedCostUsd: v.number(), // list price, even inside the free tier
    status: v.union(v.literal("success"), v.literal("error")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_user", ["userId"]) // + implicit _creationTime → daily quotas
    .index("by_kind", ["kind"]) // + implicit _creationTime → global monthly TTS cap
    .index("by_consumed", ["consumed"]),
});
