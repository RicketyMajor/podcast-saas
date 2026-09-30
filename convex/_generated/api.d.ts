/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_actions from "../ai/actions.js";
import type * as ai_audio from "../ai/audio.js";
import type * as ai_config from "../ai/config.js";
import type * as ai_generations from "../ai/generations.js";
import type * as ai_providers_googleTts from "../ai/providers/googleTts.js";
import type * as ai_providers_types from "../ai/providers/types.js";
import type * as ai_voices from "../ai/voices.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_limits from "../lib/limits.js";
import type * as lib_text from "../lib/text.js";
import type * as podcasts from "../podcasts.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/actions": typeof ai_actions;
  "ai/audio": typeof ai_audio;
  "ai/config": typeof ai_config;
  "ai/generations": typeof ai_generations;
  "ai/providers/googleTts": typeof ai_providers_googleTts;
  "ai/providers/types": typeof ai_providers_types;
  "ai/voices": typeof ai_voices;
  auth: typeof auth;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/limits": typeof lib_limits;
  "lib/text": typeof lib_text;
  podcasts: typeof podcasts;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
