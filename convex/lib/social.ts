import { getAuthUserId } from "@convex-dev/auth/server";

import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// ponytail: reads up to 500 blocks per direction; past that, the oldest
// blocked accounts show up again. Page through them if anyone gets there.
const MAX_BLOCKS_READ = 500;

/**
 * Accounts the signed-in user must not see: the ones they blocked and the
 * ones that blocked them. No session = nothing hidden, and no reads.
 */
export async function hiddenAuthorIds(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return new Set<Id<"users">>();
  const [blocked, blockers] = await Promise.all([
    ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (q) => q.eq("blockerId", userId))
      .take(MAX_BLOCKS_READ),
    ctx.db
      .query("blocks")
      .withIndex("by_blocked", (q) => q.eq("blockedId", userId))
      .take(MAX_BLOCKS_READ),
  ]);
  return new Set([
    ...blocked.map((b) => b.blockedId),
    ...blockers.map((b) => b.blockerId),
  ]);
}

/**
 * The first `n` docs that pass `keep`, reading only as far as needed: with
 * nothing to skip it reads exactly what `.take(n)` would.
 */
export async function takeWhere<T>(
  docs: AsyncIterable<T>,
  n: number,
  keep: (doc: T) => boolean,
) {
  const kept: T[] = [];
  if (n < 1) return kept;
  for await (const doc of docs) {
    if (!keep(doc)) continue;
    kept.push(doc);
    if (kept.length === n) break;
  }
  return kept;
}

/** The follow from `followerId` to `followeeId`, if any. */
export const followOf = (
  ctx: QueryCtx,
  followerId: Id<"users">,
  followeeId: Id<"users">,
) =>
  ctx.db
    .query("follows")
    .withIndex("by_follower_and_followee", (q) =>
      q.eq("followerId", followerId).eq("followeeId", followeeId),
    )
    .first();

/** The block `blockerId` put on `blockedId`, if any. */
export const blockOf = (
  ctx: QueryCtx,
  blockerId: Id<"users">,
  blockedId: Id<"users">,
) =>
  ctx.db
    .query("blocks")
    .withIndex("by_blocker_and_blocked", (q) =>
      q.eq("blockerId", blockerId).eq("blockedId", blockedId),
    )
    .first();
