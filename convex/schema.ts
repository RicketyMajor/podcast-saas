import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  // Overrides the Convex Auth `users` table: keeps its fields and indexes, adds ours.
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

  // A program that groups episodes; one RSS feed per show (phase 19).
  shows: defineTable({
    authorId: v.id("users"),
    authorName: v.string(), // denormalized, like podcasts.authorName
    title: v.string(),
    description: v.string(),
    languageCode: v.string(), // default for its new episodes
    category: v.string(), // Apple Podcasts text, one of SHOW_CATEGORIES
    explicit: v.boolean(),
    // Public in the feed; Spotify mails its ownership code here (phase 20).
    directoryEmail: v.optional(v.string()),
    imageStorageId: v.id("_storage"),
    imageSource: v.union(v.literal("ai"), v.literal("upload")),
    imagePrompt: v.optional(v.string()),
    // Denormalized counters, updated with the episode changes.
    episodeCount: v.number(),
    totalViews: v.number(),
    searchText: v.string(), // normalizeSearchText(`${title} ${authorName}`)
  })
    .index("by_author", ["authorId"])
    .index("by_views", ["totalViews"])
    .index("by_image", ["imageStorageId"]) // a cover belongs to one show or podcast
    .searchIndex("search_text", { searchField: "searchText" }),

  podcasts: defineTable({
    showId: v.id("shows"), // every episode belongs to a show (ADR-029)
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
    // Its audio opens with the spoken AI notice; copied from the generation.
    spokenDisclosure: v.optional(v.boolean()),
    // Two named hosts = a conversation (phase 21); absent = one-voice
    // narration. voiceId above stays the first host's voice.
    hosts: v.optional(
      v.array(v.object({ name: v.string(), voiceId: v.string() })),
    ),
    audioStorageId: v.id("_storage"),
    audioDurationSec: v.number(),
    // No own cover = the show's cover. Source and prompt go with the file.
    imageStorageId: v.optional(v.id("_storage")),
    imageSource: v.optional(v.union(v.literal("ai"), v.literal("upload"))),
    imagePrompt: v.optional(v.string()),
    views: v.number(),
    searchText: v.string(), // searchTextOf(title, authorName, show title)
  })
    .index("by_show", ["showId"])
    .index("by_author", ["authorId"])
    .index("by_views", ["views"])
    .index("by_language", ["languageCode"])
    .index("by_image", ["imageStorageId"]) // an uploaded cover belongs to one podcast
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
    // "pending" reserves quota while the provider call runs (ADR-017).
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("error"),
    ),
    errorMessage: v.optional(v.string()),
    // Audio only: whether the notice was voiced first (the server's record).
    spokenDisclosure: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"]) // + implicit _creationTime → daily quotas
    .index("by_kind", ["kind"]) // + implicit _creationTime → global monthly TTS cap
    .index("by_consumed", ["consumed"])
    .index("by_storage", ["storageId"]), // file → generation, on publish
});
