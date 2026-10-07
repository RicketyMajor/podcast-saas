import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { COVER_TYPES, IMAGE_PROMPT_MAX_CHARS, UPLOAD_MAX_MB } from "./limits";
import { invalid } from "./validation";

export async function generationOf(ctx: QueryCtx, storageId: Id<"_storage">) {
  return await ctx.db
    .query("aiGenerations")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .unique();
}

/** A successful, unused generation of this kind that belongs to the user. */
export function usable(
  generation: Doc<"aiGenerations"> | null,
  userId: Id<"users">,
  kind: Doc<"aiGenerations">["kind"],
): generation is Doc<"aiGenerations"> {
  return (
    generation !== null &&
    generation.userId === userId &&
    generation.kind === kind &&
    generation.status === "success" &&
    !generation.consumed
  );
}

/** Whether a show or podcast cover, or a profile photo, uses this file. */
export async function fileInUse(ctx: QueryCtx, storageId: Id<"_storage">) {
  const [show, podcast, user] = await Promise.all([
    ctx.db
      .query("shows")
      .withIndex("by_image", (q) => q.eq("imageStorageId", storageId))
      .first(),
    ctx.db
      .query("podcasts")
      .withIndex("by_image", (q) => q.eq("imageStorageId", storageId))
      .first(),
    ctx.db
      .query("users")
      .withIndex("by_avatar", (q) => q.eq("avatarStorageId", storageId))
      .first(),
  ]);
  return show !== null || podcast !== null || user !== null;
}

/** An uploaded image nobody uses yet that passes the form's checks. */
export async function freshUpload(ctx: QueryCtx, storageId: Id<"_storage">) {
  const [file, inUse] = await Promise.all([
    ctx.db.system.get("_storage", storageId),
    fileInUse(ctx, storageId),
  ]);
  return (
    file !== null &&
    !inUse &&
    COVER_TYPES.includes(file.contentType ?? "") &&
    file.size <= UPLOAD_MAX_MB * 1024 * 1024
  );
}

// The client never decides where a cover comes from: either the user's own
// AI image, or an uploaded image that passes the same checks as the form
// (ADR-020).
export async function checkCover(
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
  // learns its id could publish it first. A file in use can't be taken
  // (fileInUse), so deleting a podcast, show or photo never deletes another's.
  if (!(await freshUpload(ctx, storageId))) {
    throw invalid("La portada no es válida. Sube una imagen PNG, JPG o WebP.");
  }
  return { generation: null, imageSource: "upload" as const };
}

/** Keeps cleanupOrphans (phase 13) away from published files. */
export async function markConsumed(
  ctx: MutationCtx,
  generation: Doc<"aiGenerations"> | null,
) {
  if (generation) {
    await ctx.db.patch("aiGenerations", generation._id, { consumed: true });
  }
}

export const promptOf = (
  source: "ai" | "upload",
  prompt: string | undefined,
) =>
  source === "ai" ? prompt?.trim().slice(0, IMAGE_PROMPT_MAX_CHARS) : undefined;
