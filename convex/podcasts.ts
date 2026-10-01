import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { LANGUAGES, VOICES, voiceId } from "./ai/voices";
import { authorNameOf, getCurrentUserOrThrow } from "./lib/auth";
import {
  COVER_TYPES,
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
      .paginate(paginationOpts);
    return {
      ...result,
      page: await Promise.all(result.page.map((p) => toCard(ctx, p))),
    };
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
// image that passes the same checks as the form.
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    transcript: v.string(),
    languageCode: v.string(),
    voiceName: v.string(),
    speakingRate: v.number(),
    audioStorageId: v.id("_storage"),
    imageStorageId: v.id("_storage"),
    imagePrompt: v.optional(v.string()),
  },
  returns: v.id("podcasts"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const title = text(args.title, "El título", TITLE_MIN_CHARS, TITLE_MAX_CHARS);
    const description = text(
      args.description,
      "La descripción",
      DESCRIPTION_MIN_CHARS,
      DESCRIPTION_MAX_CHARS,
    );
    const transcript = text(
      args.transcript,
      "El guion",
      SCRIPT_MIN_CHARS,
      SCRIPT_MAX_CHARS,
    );
    if (!LANGUAGES.some((l) => l.code === args.languageCode)) {
      throw invalid("Idioma no disponible.");
    }
    if (!VOICES.some((voice) => voice.name === args.voiceName)) {
      throw invalid("Voz no disponible.");
    }
    if (!(SPEAKING_RATES as readonly number[]).includes(args.speakingRate)) {
      throw invalid("Velocidad no disponible.");
    }

    // ponytail: the generation doesn't record which script it voiced, so a
    // stale audio is only blocked in the UI; store a script hash on the
    // generation if that needs enforcing server-side.
    const audio = await generationOf(ctx, args.audioStorageId);
    if (!usable(audio, user._id, "audio") || audio?.outputSeconds === undefined) {
      throw invalid("El audio no es válido. Vuelve a generarlo.");
    }

    const image = await generationOf(ctx, args.imageStorageId);
    let imageSource: "ai" | "upload";
    if (image !== null) {
      if (!usable(image, user._id, "image")) {
        throw invalid("La portada no es válida. Vuelve a generarla.");
      }
      imageSource = "ai";
    } else {
      // ponytail: an uploaded file isn't tied to its uploader; someone who
      // learns another user's unpublished upload id could reuse it.
      const file = await ctx.db.system.get("_storage", args.imageStorageId);
      if (
        file === null ||
        !COVER_TYPES.includes(file.contentType ?? "") ||
        file.size > UPLOAD_MAX_MB * 1024 * 1024
      ) {
        throw invalid("La portada no es válida. Sube una imagen PNG, JPG o WebP.");
      }
      imageSource = "upload";
    }

    const authorName = authorNameOf(user);
    const podcastId = await ctx.db.insert("podcasts", {
      authorId: user._id,
      authorName,
      authorImageUrl: user.image ?? "",
      title,
      description,
      transcript,
      languageCode: args.languageCode,
      voiceProvider: "google",
      voiceId: voiceId(args.languageCode, args.voiceName),
      speakingRate: args.speakingRate,
      audioStorageId: args.audioStorageId,
      audioDurationSec: audio.outputSeconds,
      imageStorageId: args.imageStorageId,
      imageSource,
      imagePrompt:
        imageSource === "ai"
          ? args.imagePrompt?.trim().slice(0, IMAGE_PROMPT_MAX_CHARS)
          : undefined,
      views: 0,
      searchText: normalizeSearchText(`${title} ${authorName}`),
    });

    await ctx.db.patch("users", user._id, {
      podcastCount: (user.podcastCount ?? 0) + 1,
    });
    // markConsumed: keeps cleanupOrphans (phase 13) away from published files.
    for (const generation of [audio, image]) {
      if (generation) {
        await ctx.db.patch("aiGenerations", generation._id, { consumed: true });
      }
    }
    return podcastId;
  },
});
