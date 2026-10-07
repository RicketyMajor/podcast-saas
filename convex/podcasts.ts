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
import {
  assertOwner,
  authorNameOf,
  avatarUrlOf,
  getCurrentUserOrThrow,
} from "./lib/auth";
import {
  checkCover,
  generationOf,
  markConsumed,
  promptOf,
  usable,
} from "./lib/covers";
import {
  clampLimit,
  DEFAULT_SPEAKING_RATE,
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MIN_CHARS,
  SCRIPT_MAX_CHARS,
  SCRIPT_MIN_CHARS,
  SPEAKING_RATES,
  TITLE_MAX_CHARS,
  TITLE_MIN_CHARS,
} from "./lib/limits";
import { normalizeSearchText, searchTextOf } from "./lib/text";
import {
  checkDialogue,
  hostInput,
  hostsResult,
  invalid,
  publicHosts,
  text,
  type HostInput,
} from "./lib/validation";
import { getOwnShow } from "./shows";

// What lists and cards need: no transcript, URLs already resolved.
const podcastCard = v.object({
  _id: v.id("podcasts"),
  _creationTime: v.number(),
  title: v.string(),
  authorId: v.id("users"),
  authorName: v.string(),
  audioDurationSec: v.number(),
  views: v.number(),
  imageUrl: v.union(v.string(), v.null()),
  audioUrl: v.union(v.string(), v.null()),
});

/** The episode's own cover, else its show's (the show doc when already read). */
async function coverUrl(
  ctx: QueryCtx,
  p: Doc<"podcasts">,
  show?: Doc<"shows"> | null,
) {
  if (p.imageStorageId) return await ctx.storage.getUrl(p.imageStorageId);
  const owner = show !== undefined ? show : await ctx.db.get("shows", p.showId);
  return owner ? await ctx.storage.getUrl(owner.imageStorageId) : null;
}

async function toCard(ctx: QueryCtx, p: Doc<"podcasts">) {
  const [imageUrl, audioUrl] = await Promise.all([
    coverUrl(ctx, p),
    ctx.storage.getUrl(p.audioStorageId),
  ]);
  return {
    _id: p._id,
    _creationTime: p._creationTime,
    title: p.title,
    authorId: p.authorId,
    authorName: p.authorName,
    audioDurationSec: p.audioDurationSec,
    views: p.views,
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
      .take(clampLimit(limit, 8, 50));
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

// searchText = normalized title + author + show title (searchTextOf). The
// last term matches as a prefix; no typo tolerance (Convex).
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

// ponytail: capped at 100, newest first, like getByAuthor.
export const getByShow = query({
  args: { showId: v.id("shows") },
  returns: v.array(podcastCard),
  handler: async (ctx, { showId }) => {
    const podcasts = await ctx.db
      .query("podcasts")
      .withIndex("by_show", (q) => q.eq("showId", showId))
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
  authorImageUrl: v.union(v.string(), v.null()),
  title: v.string(),
  description: v.string(),
  transcript: v.string(),
  languageCode: v.string(),
  voiceName: v.string(),
  speakingRate: v.number(),
  spokenDisclosure: v.boolean(), // its audio opens with the AI notice
  hosts: hostsResult, // null = one-voice narration
  audioDurationSec: v.number(),
  showId: v.id("shows"),
  showTitle: v.union(v.string(), v.null()), // null only if the show vanished
  // Absent = the episode uses its show's cover.
  imageSource: v.optional(v.union(v.literal("ai"), v.literal("upload"))),
  imagePrompt: v.optional(v.string()),
  views: v.number(),
  imageUrl: v.union(v.string(), v.null()),
  audioUrl: v.union(v.string(), v.null()),
  // Version the directory URLs (feed): own cover only, null = the show's.
  audioStorageId: v.id("_storage"),
  imageStorageId: v.union(v.id("_storage"), v.null()),
});

export const getById = query({
  // A string, so a malformed id in the URL reads as "doesn't exist".
  args: { podcastId: v.string() },
  returns: v.union(podcastDetail, v.null()),
  handler: async (ctx, args) => {
    const podcastId = ctx.db.normalizeId("podcasts", args.podcastId);
    const p = podcastId && (await ctx.db.get("podcasts", podcastId));
    if (!p) return null;
    const [show, author] = await Promise.all([
      ctx.db.get("shows", p.showId),
      ctx.db.get("users", p.authorId),
    ]);
    const [imageUrl, audioUrl, authorImageUrl] = await Promise.all([
      coverUrl(ctx, p, show),
      ctx.storage.getUrl(p.audioStorageId),
      author ? avatarUrlOf(ctx, author) : null,
    ]);
    return {
      _id: p._id,
      _creationTime: p._creationTime,
      authorId: p.authorId,
      authorName: p.authorName,
      authorImageUrl,
      title: p.title,
      description: p.description,
      transcript: p.transcript,
      languageCode: p.languageCode,
      voiceName: voiceNameOf(p.voiceId),
      speakingRate: p.speakingRate ?? DEFAULT_SPEAKING_RATE,
      spokenDisclosure: p.spokenDisclosure === true,
      hosts: publicHosts(p.hosts),
      audioDurationSec: p.audioDurationSec,
      showId: p.showId,
      showTitle: show?.title ?? null,
      imageSource: p.imageSource,
      imagePrompt: p.imagePrompt,
      views: p.views,
      imageUrl,
      audioUrl,
      audioStorageId: p.audioStorageId,
      imageStorageId: p.imageStorageId ?? null,
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

// Editable fields, shared by create and update.
const podcastFields = {
  title: v.string(),
  description: v.string(),
  transcript: v.string(),
  languageCode: v.string(),
  voiceName: v.string(),
  speakingRate: v.number(),
  imagePrompt: v.optional(v.string()),
  // Two named hosts = a conversation; the first one speaks with voiceName.
  hosts: v.optional(v.array(hostInput)),
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

/** What the podcast stores for a conversation (undefined = narration). */
const storedHosts = (
  languageCode: string,
  dialogue: ReturnType<typeof checkDialogue>,
) =>
  dialogue?.hosts.map((h) => ({
    name: h.name,
    voiceId: voiceId(languageCode, h.voiceName),
  }));

/** Same hosts in the same order (null = narration). */
const sameHosts = (a: HostInput[] | null, b: HostInput[] | null) =>
  (a?.length ?? 0) === (b?.length ?? 0) &&
  (a ?? []).every(
    (h, i) => h.name === b?.[i]?.name && h.voiceName === b?.[i]?.voiceName,
  );

// The client never decides where files come from: the audio must be the
// user's own TTS output (covers: lib/covers.ts, ADR-020).
async function checkAudio(
  ctx: QueryCtx,
  userId: Id<"users">,
  storageId: Id<"_storage">,
) {
  // ponytail: the generation doesn't record which script it voiced, so a
  // stale new audio is only blocked in the UI; store a script hash on the
  // generation if that needs enforcing server-side.
  const audio = await generationOf(ctx, storageId);
  if (!usable(audio, userId, "audio") || audio.outputSeconds === undefined) {
    throw invalid("El audio no es válido. Vuelve a generarlo.");
  }
  return {
    generation: audio,
    durationSec: audio.outputSeconds,
    // The generation is the record of what was voiced, not the client.
    spokenDisclosure: audio.spokenDisclosure === true,
  };
}

export const create = mutation({
  args: {
    ...podcastFields,
    showId: v.id("shows"),
    audioStorageId: v.id("_storage"),
    // Omitted = the episode uses its show's cover.
    imageStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("podcasts"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const show = await getOwnShow(ctx, user, args.showId);
    const fields = checkFields(args);
    const hosts = storedHosts(
      args.languageCode,
      checkDialogue(fields.transcript, args.voiceName, args.hosts),
    );
    const audio = await checkAudio(ctx, user._id, args.audioStorageId);
    const cover = args.imageStorageId
      ? await checkCover(ctx, user._id, args.imageStorageId)
      : null;

    const authorName = authorNameOf(user);
    const podcastId = await ctx.db.insert("podcasts", {
      ...fields,
      showId: show._id,
      authorId: user._id,
      authorName,
      languageCode: args.languageCode,
      voiceProvider: "google",
      voiceId: voiceId(args.languageCode, args.voiceName),
      speakingRate: args.speakingRate,
      audioStorageId: args.audioStorageId,
      audioDurationSec: audio.durationSec,
      spokenDisclosure: audio.spokenDisclosure,
      ...(hosts && { hosts }),
      ...(cover && {
        imageStorageId: args.imageStorageId,
        imageSource: cover.imageSource,
        imagePrompt: promptOf(cover.imageSource, args.imagePrompt),
      }),
      views: 0,
      searchText: searchTextOf(fields.title, authorName, show.title),
    });

    await ctx.db.patch("users", user._id, {
      podcastCount: (user.podcastCount ?? 0) + 1,
    });
    await ctx.db.patch("shows", show._id, {
      episodeCount: show.episodeCount + 1,
    });
    await markConsumed(ctx, audio.generation);
    await markConsumed(ctx, cover?.generation ?? null);
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

/** Moves an episode's weight off its show (or onto it, with sign = 1). */
async function shiftShowCounters(
  ctx: MutationCtx,
  showId: Id<"shows">,
  views: number,
  sign: 1 | -1,
) {
  const show = await ctx.db.get("shows", showId);
  if (!show) return;
  await ctx.db.patch("shows", show._id, {
    episodeCount: Math.max(show.episodeCount + sign, 0),
    totalViews: Math.max(show.totalViews + sign * views, 0),
  });
}

// Omitted (or unchanged) file ids keep the current file; a new one goes
// through the same checks as create and the old file is deleted.
export const update = mutation({
  args: {
    podcastId: v.id("podcasts"),
    ...podcastFields,
    showId: v.id("shows"),
    audioStorageId: v.optional(v.id("_storage")),
    // null = drop the episode's own cover and use its show's.
    imageStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user, podcast } = await getOwnPodcast(ctx, args.podcastId);
    // Moving into a show checks that show too, not just the episode.
    const show = await getOwnShow(ctx, user, args.showId);
    const fields = checkFields(args);
    const dialogue = checkDialogue(
      fields.transcript,
      args.voiceName,
      args.hosts,
    );

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
        args.speakingRate !== (podcast.speakingRate ?? DEFAULT_SPEAKING_RATE) ||
        // Renaming a host or swapping a voice changes what the audio says.
        !sameHosts(dialogue?.hosts ?? null, publicHosts(podcast.hosts)))
    ) {
      throw invalid(
        "El audio ya no coincide con el guion. Vuelve a generarlo.",
      );
    }
    const newCover =
      args.imageStorageId && args.imageStorageId !== podcast.imageStorageId
        ? await checkCover(ctx, user._id, args.imageStorageId)
        : null;
    const dropCover =
      args.imageStorageId === null && podcast.imageStorageId !== undefined;

    await ctx.db.patch("podcasts", podcast._id, {
      ...fields,
      showId: show._id,
      languageCode: args.languageCode,
      voiceId: voiceId(args.languageCode, args.voiceName),
      speakingRate: args.speakingRate,
      // undefined removes it: back to narration.
      hosts: storedHosts(args.languageCode, dialogue),
      // Edits never change the author, so authorName is still current.
      searchText: searchTextOf(fields.title, podcast.authorName, show.title),
      ...(newAudio && {
        audioStorageId: args.audioStorageId,
        audioDurationSec: newAudio.durationSec,
        spokenDisclosure: newAudio.spokenDisclosure,
      }),
      ...(newCover
        ? {
            imageStorageId: args.imageStorageId ?? undefined,
            imageSource: newCover.imageSource,
            imagePrompt: promptOf(newCover.imageSource, args.imagePrompt),
          }
        : dropCover
          ? {
              imageStorageId: undefined,
              imageSource: undefined,
              imagePrompt: undefined,
            }
          : {}),
    });

    if (podcast.showId !== show._id) {
      await shiftShowCounters(ctx, podcast.showId, podcast.views, -1);
      await shiftShowCounters(ctx, show._id, podcast.views, 1);
    }
    if (newAudio) {
      await markConsumed(ctx, newAudio.generation);
      await ctx.storage.delete(podcast.audioStorageId);
    }
    if (newCover) await markConsumed(ctx, newCover.generation);
    if ((newCover || dropCover) && podcast.imageStorageId) {
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
    await shiftShowCounters(ctx, podcast.showId, podcast.views, -1);
    await ctx.storage.delete(podcast.audioStorageId);
    // An inherited cover is the show's: it stays.
    if (podcast.imageStorageId)
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
    // ponytail: a third write per play, on the show doc that every play of
    // its episodes shares; watch `occRetried` in insights, and move the
    // counters to @convex-dev/sharded-counter if it shows up.
    const show = await ctx.db.get("shows", podcast.showId);
    if (show) {
      await ctx.db.patch("shows", show._id, {
        totalViews: show.totalViews + 1,
      });
    }
    const author = await ctx.db.get("users", podcast.authorId);
    if (author !== null) {
      await ctx.db.patch("users", author._id, {
        totalViews: (author.totalViews ?? 0) + 1,
      });
    }
    return null;
  },
});
