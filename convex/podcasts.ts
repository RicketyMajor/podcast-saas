import { getAuthUserId } from "@convex-dev/auth/server";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { components } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { LANGUAGES, VOICES, voiceId, voiceNameOf } from "./ai/voices";
import { assertOwner, authorNameOf, getCurrentUserOrThrow } from "./lib/auth";
import {
  COVER_TYPES,
  DEFAULT_SPEAKING_RATE,
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MIN_CHARS,
  IMAGE_PROMPT_MAX_CHARS,
  SCRIPT_MAX_CHARS,
  SCRIPT_MIN_CHARS,
  SPEAKING_RATES,
  TITLE_MAX_CHARS,
  TITLE_MIN_CHARS,
  UPLOAD_MAX_MB,
} from "./lib/limits";
import { normalizeSearchText } from "./lib/text";

// What lists and cards need: no transcript, URLs already resolved.
const podcastCard = v.object({
  _id: v.id("podcasts"),
  _creationTime: v.number(),
  title: v.string(),
  authorId: v.id("users"),
  authorName: v.string(),
  audioDurationSec: v.number(),
  imageUrl: v.union(v.string(), v.null()),
  audioUrl: v.union(v.string(), v.null()),
});

async function toCard(ctx: QueryCtx, p: Doc<"podcasts">) {
  const [imageUrl, audioUrl] = await Promise.all([
    ctx.storage.getUrl(p.imageStorageId),
    ctx.storage.getUrl(p.audioStorageId),
  ]);
  return {
    _id: p._id,
    _creationTime: p._creationTime,
    title: p.title,
    authorId: p.authorId,
    authorName: p.authorName,
    audioDurationSec: p.audioDurationSec,
    imageUrl,
    audioUrl,
  };
}

export const getTrending = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(podcastCard),
  handler: async (ctx, { limit }) => {
    const podcasts = await ctx.db
      .query("podcasts")
      .withIndex("by_views")
      .order("desc")
      .take(Math.min(limit ?? 8, 50));
    return await Promise.all(podcasts.map((p) => toCard(ctx, p)));
  },
});

export const getLatest = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(podcastCard),
  handler: async (ctx, { paginationOpts }) => {
    const result = await ctx.db
      .query("podcasts")
      .order("desc")
      // Public endpoint: cap the page size the client asks for.
      .paginate({
        ...paginationOpts,
        numItems: Math.min(paginationOpts.numItems, 50),
      });
    return {
      ...result,
      page: await Promise.all(result.page.map((p) => toCard(ctx, p))),
    };
  },
});

// searchText = normalized title + author, so a creator's name finds their
// podcasts. The last term matches as a prefix; no typo tolerance (Convex).
export const search = query({
  args: { query: v.string() },
  returns: v.array(podcastCard),
  handler: async (ctx, args) => {
    const query = normalizeSearchText(args.query.slice(0, 100));
    if (query === "") return [];
    const podcasts = await ctx.db
      .query("podcasts")
      .withSearchIndex("search_text", (q) => q.search("searchText", query))
      .take(30);
    return await Promise.all(podcasts.map((p) => toCard(ctx, p)));
  },
});

// ponytail: capped at 100, newest first; paginate when a creator gets there.
export const getByAuthor = query({
  args: { authorId: v.id("users") },
  returns: v.array(podcastCard),
  handler: async (ctx, { authorId }) => {
    const podcasts = await ctx.db
      .query("podcasts")
      .withIndex("by_author", (q) => q.eq("authorId", authorId))
      .order("desc")
      .take(100);
    return await Promise.all(podcasts.map((p) => toCard(ctx, p)));
  },
});

// Full podcast for the detail page and the edit form. Storage ids stay on the
// server: knowing one is what would let someone reuse a file (see checkCover).
const podcastDetail = v.object({
  _id: v.id("podcasts"),
  _creationTime: v.number(),
  authorId: v.id("users"),
  authorName: v.string(),
  authorImageUrl: v.string(),
  title: v.string(),
  description: v.string(),
  transcript: v.string(),
  languageCode: v.string(),
  voiceName: v.string(),
  speakingRate: v.number(),
  audioDurationSec: v.number(),
  imageSource: v.union(v.literal("ai"), v.literal("upload")),
  imagePrompt: v.optional(v.string()),
  views: v.number(),
  imageUrl: v.union(v.string(), v.null()),
  audioUrl: v.union(v.string(), v.null()),
});

export const getById = query({
  // A string, so a malformed id in the URL reads as "doesn't exist".
  args: { podcastId: v.string() },
  returns: v.union(podcastDetail, v.null()),
  handler: async (ctx, args) => {
    const podcastId = ctx.db.normalizeId("podcasts", args.podcastId);
    const p = podcastId && (await ctx.db.get("podcasts", podcastId));
    if (!p) return null;
    const [imageUrl, audioUrl] = await Promise.all([
      ctx.storage.getUrl(p.imageStorageId),
      ctx.storage.getUrl(p.audioStorageId),
    ]);
    return {
      _id: p._id,
      _creationTime: p._creationTime,
      authorId: p.authorId,
      authorName: p.authorName,
      authorImageUrl: p.authorImageUrl,
      title: p.title,
      description: p.description,
      transcript: p.transcript,
      languageCode: p.languageCode,
      voiceName: voiceNameOf(p.voiceId),
      speakingRate: p.speakingRate ?? DEFAULT_SPEAKING_RATE,
      audioDurationSec: p.audioDurationSec,
      imageSource: p.imageSource,
      imagePrompt: p.imagePrompt,
      views: p.views,
      imageUrl,
      audioUrl,
    };
  },
});

export const getSimilar = query({
  args: { podcastId: v.id("podcasts") },
  returns: v.array(podcastCard),
  handler: async (ctx, { podcastId }) => {
    const podcast = await ctx.db.get("podcasts", podcastId);
    if (podcast === null) return [];
    const similar = await ctx.db
      .query("podcasts")
      .withIndex("by_language", (q) =>
        q.eq("languageCode", podcast.languageCode),
      )
      .order("desc")
      .take(5);
    return await Promise.all(
      similar
        .filter((p) => p._id !== podcastId)
        .slice(0, 4)
        .map((p) => toCard(ctx, p)),
    );
  },
});

function invalid(message: string) {
  return new ConvexError({ code: "VALIDATION", message });
}

function text(value: string, label: string, min: number, max: number) {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw invalid(`${label} debe tener entre ${min} y ${max} caracteres.`);
  }
  return trimmed;
}

// Editable fields, shared by create and update.
const podcastFields = {
  title: v.string(),
  description: v.string(),
  transcript: v.string(),
  languageCode: v.string(),
  voiceName: v.string(),
  speakingRate: v.number(),
  imagePrompt: v.optional(v.string()),
};

function checkFields(args: {
  title: string;
  description: string;
  transcript: string;
  languageCode: string;
  voiceName: string;
  speakingRate: number;
}) {
  if (!LANGUAGES.some((l) => l.code === args.languageCode)) {
    throw invalid("Idioma no disponible.");
  }
  if (!VOICES.some((voice) => voice.name === args.voiceName)) {
    throw invalid("Voz no disponible.");
  }
  if (!(SPEAKING_RATES as readonly number[]).includes(args.speakingRate)) {
    throw invalid("Velocidad no disponible.");
  }
  return {
    title: text(args.title, "El título", TITLE_MIN_CHARS, TITLE_MAX_CHARS),
    description: text(
      args.description,
      "La descripción",
      DESCRIPTION_MIN_CHARS,
      DESCRIPTION_MAX_CHARS,
    ),
    transcript: text(
      args.transcript,
      "El guion",
      SCRIPT_MIN_CHARS,
      SCRIPT_MAX_CHARS,
    ),
  };
}

async function generationOf(ctx: QueryCtx, storageId: Id<"_storage">) {
  return await ctx.db
    .query("aiGenerations")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .unique();
}

/** A successful, unused generation of this kind that belongs to the user. */
function usable(
  generation: Doc<"aiGenerations"> | null,
  userId: Id<"users">,
  kind: Doc<"aiGenerations">["kind"],
) {
  return (
    generation !== null &&
    generation.userId === userId &&
    generation.kind === kind &&
    generation.status === "success" &&
    !generation.consumed
  );
}

// The client never decides where files come from: the audio must be the
// user's own TTS output, and the cover either their AI image or an uploaded
// image that passes the same checks as the form (ADR-020).
async function checkAudio(
  ctx: QueryCtx,
  userId: Id<"users">,
  storageId: Id<"_storage">,
) {
  // ponytail: the generation doesn't record which script it voiced, so a
  // stale new audio is only blocked in the UI; store a script hash on the
  // generation if that needs enforcing server-side.
  const audio = await generationOf(ctx, storageId);
  if (!usable(audio, userId, "audio") || audio?.outputSeconds === undefined) {
    throw invalid("El audio no es válido. Vuelve a generarlo.");
  }
  return { generation: audio, durationSec: audio.outputSeconds };
}

async function checkCover(
  ctx: QueryCtx,
  userId: Id<"users">,
  storageId: Id<"_storage">,
) {
  const generation = await generationOf(ctx, storageId);
  if (generation !== null) {
    if (!usable(generation, userId, "image")) {
      throw invalid("La portada no es válida. Vuelve a generarla.");
    }
    return { generation, imageSource: "ai" as const };
  }
  // ponytail: an unpublished upload isn't tied to its uploader; someone who
  // learns its id could publish it first. A published one can't be taken
  // (by_image), so deleting a podcast never deletes another podcast's cover.
  const [file, owner] = await Promise.all([
    ctx.db.system.get("_storage", storageId),
    ctx.db
      .query("podcasts")
      .withIndex("by_image", (q) => q.eq("imageStorageId", storageId))
      .first(),
  ]);
  if (
    file === null ||
    owner !== null ||
    !COVER_TYPES.includes(file.contentType ?? "") ||
    file.size > UPLOAD_MAX_MB * 1024 * 1024
  ) {
    throw invalid("La portada no es válida. Sube una imagen PNG, JPG o WebP.");
  }
  return { generation: null, imageSource: "upload" as const };
}

/** Keeps cleanupOrphans (phase 13) away from published files. */
async function markConsumed(
  ctx: MutationCtx,
  generation: Doc<"aiGenerations"> | null,
) {
  if (generation) {
    await ctx.db.patch("aiGenerations", generation._id, { consumed: true });
  }
}

const promptOf = (source: "ai" | "upload", prompt: string | undefined) =>
  source === "ai" ? prompt?.trim().slice(0, IMAGE_PROMPT_MAX_CHARS) : undefined;

export const create = mutation({
  args: {
    ...podcastFields,
    audioStorageId: v.id("_storage"),
    imageStorageId: v.id("_storage"),
  },
  returns: v.id("podcasts"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const fields = checkFields(args);
    const audio = await checkAudio(ctx, user._id, args.audioStorageId);
    const cover = await checkCover(ctx, user._id, args.imageStorageId);

    const authorName = authorNameOf(user);
    const podcastId = await ctx.db.insert("podcasts", {
      ...fields,
      authorId: user._id,
      authorName,
      authorImageUrl: user.image ?? "",
      languageCode: args.languageCode,
      voiceProvider: "google",
      voiceId: voiceId(args.languageCode, args.voiceName),
      speakingRate: args.speakingRate,
      audioStorageId: args.audioStorageId,
      audioDurationSec: audio.durationSec,
      imageStorageId: args.imageStorageId,
      imageSource: cover.imageSource,
      imagePrompt: promptOf(cover.imageSource, args.imagePrompt),
      views: 0,
      searchText: normalizeSearchText(`${fields.title} ${authorName}`),
    });

    await ctx.db.patch("users", user._id, {
      podcastCount: (user.podcastCount ?? 0) + 1,
    });
    await markConsumed(ctx, audio.generation);
    await markConsumed(ctx, cover.generation);
    return podcastId;
  },
});

async function getOwnPodcast(ctx: MutationCtx, podcastId: Id<"podcasts">) {
  const user = await getCurrentUserOrThrow(ctx);
  const podcast = await ctx.db.get("podcasts", podcastId);
  if (podcast === null) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Este podcast no existe o fue eliminado.",
    });
  }
  assertOwner(podcast, user);
  return { user, podcast };
}

// Omitted (or unchanged) file ids keep the current file; a new one goes
// through the same checks as create and the old file is deleted.
export const update = mutation({
  args: {
    podcastId: v.id("podcasts"),
    ...podcastFields,
    audioStorageId: v.optional(v.id("_storage")),
    imageStorageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user, podcast } = await getOwnPodcast(ctx, args.podcastId);
    const fields = checkFields(args);

    const newAudio =
      args.audioStorageId !== undefined &&
      args.audioStorageId !== podcast.audioStorageId
        ? await checkAudio(ctx, user._id, args.audioStorageId)
        : null;
    // The kept audio must still match what it voices.
    if (
      newAudio === null &&
      (fields.transcript !== podcast.transcript ||
        args.languageCode !== podcast.languageCode ||
        args.voiceName !== voiceNameOf(podcast.voiceId) ||
        args.speakingRate !== (podcast.speakingRate ?? DEFAULT_SPEAKING_RATE))
    ) {
      throw invalid(
        "El audio ya no coincide con el guion. Vuelve a generarlo.",
      );
    }
    const newCover =
      args.imageStorageId !== undefined &&
      args.imageStorageId !== podcast.imageStorageId
        ? await checkCover(ctx, user._id, args.imageStorageId)
        : null;

    await ctx.db.patch("podcasts", podcast._id, {
      ...fields,
      languageCode: args.languageCode,
      voiceId: voiceId(args.languageCode, args.voiceName),
      speakingRate: args.speakingRate,
      // Edits never change the author, so authorName is still current.
      searchText: normalizeSearchText(`${fields.title} ${podcast.authorName}`),
      ...(newAudio && {
        audioStorageId: args.audioStorageId,
        audioDurationSec: newAudio.durationSec,
      }),
      ...(newCover
        ? {
            imageStorageId: args.imageStorageId,
            imageSource: newCover.imageSource,
            imagePrompt: promptOf(newCover.imageSource, args.imagePrompt),
          }
        : {}),
    });

    if (newAudio) {
      await markConsumed(ctx, newAudio.generation);
      await ctx.storage.delete(podcast.audioStorageId);
    }
    if (newCover) {
      await markConsumed(ctx, newCover.generation);
      await ctx.storage.delete(podcast.imageStorageId);
    }
    return null;
  },
});

export const remove = mutation({
  args: { podcastId: v.id("podcasts") },
  returns: v.null(),
  handler: async (ctx, { podcastId }) => {
    const { user, podcast } = await getOwnPodcast(ctx, podcastId);
    await ctx.db.delete("podcasts", podcastId);
    await ctx.db.patch("users", user._id, {
      podcastCount: Math.max((user.podcastCount ?? 0) - 1, 0),
      totalViews: Math.max((user.totalViews ?? 0) - podcast.views, 0),
    });
    await ctx.storage.delete(podcast.audioStorageId);
    await ctx.storage.delete(podcast.imageStorageId);
    return null;
  },
});

// Views are public and need no session (architecture §5.6). Convex doesn't
// expose the caller's IP, so a signed-in listener counts once per podcast per
// hour, and anonymous plays share a per-podcast budget.
// ponytail: that budget still lets a script add up to 60 views/h per podcast;
// require a session or add a captcha if views ever drive money or ranking.
const viewLimits = new RateLimiter(components.rateLimiter, {
  viewByUser: { kind: "fixed window", rate: 1, period: HOUR },
  viewAnonymous: { kind: "token bucket", rate: 60, period: HOUR },
});

export const registerView = mutation({
  args: { podcastId: v.id("podcasts") },
  returns: v.null(),
  handler: async (ctx, { podcastId }) => {
    const podcast = await ctx.db.get("podcasts", podcastId);
    if (podcast === null) return null;
    const userId = await getAuthUserId(ctx);
    const { ok } = userId
      ? await viewLimits.limit(ctx, "viewByUser", {
          key: `${userId}:${podcastId}`,
        })
      : await viewLimits.limit(ctx, "viewAnonymous", { key: podcastId });
    if (!ok) return null; // silently: the listener isn't doing anything wrong
    await ctx.db.patch("podcasts", podcastId, { views: podcast.views + 1 });
    const author = await ctx.db.get("users", podcast.authorId);
    if (author !== null) {
      await ctx.db.patch("users", author._id, {
        totalViews: (author.totalViews ?? 0) + 1,
      });
    }
    return null;
  },
});
