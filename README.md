# Waves

A platform to create, host and listen to AI-generated podcasts, without recording a single human voice. You write or generate a script, pick a voice and a language, the app produces the audio with text-to-speech, you generate a cover with AI or upload one, and you publish the episode inside a show with its own RSS feed. Listeners discover, search and listen with a player that keeps playing while they browse.

**Live:** https://waves-podcasts.vercel.app (the interface is in Spanish)

![Home with an episode playing: the cover tints the interface and the player stays docked at the bottom](.github/screenshots/home.webp)

## Features

**Create**

- Write the script by hand or generate it with AI from a topic, a length and a tone.
- Two formats: a single-voice narration, or a conversation between two named hosts who take turns.
- Chirp 3 HD voices in Spanish (Latin America and Spain), English and Portuguese, at three speaking rates.
- AI-generated or uploaded cover. An episode without its own cover uses its show's.
- Optional spoken AI disclosure at the start of the audio. Every episode is labeled as AI-voiced.

**Listen**

- Persistent player that keeps playing across page changes, with an expanded "Now playing" view on mobile.
- The cover that is playing tints the whole interface with its color (ambient mode).
- Full transcript on every episode, split by host in conversations.

**Distribute**

- Every show has an RSS 2.0 feed with iTunes and Podcasting 2.0 tags, valid in the W3C Feed Validator and ready to submit to Apple Podcasts and Spotify.
- Downloadable transcripts in `.txt` and `.vtt`, 1400 px covers for directories, and audio served with its real size.

**Discover and community**

- Trending episodes, popular shows, latest episodes, and search by title, creator or show.
- Editable profile: display name, photo, bio and link.
- Follow accounts, see followers and following, and a "From people you follow" row on Home.
- Blocking: removes follows in both directions and, while signed in, each account stops seeing the other's content.

## Screenshots

| Two-host episode detail                                                                                    | Step-by-step creation form                                                                               |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ![Episode "Café a dos voces" with its transcript split by host](.github/screenshots/episode.webp)          | ![Create podcast page with the Script, Voice, Cover and Publish stages](.github/screenshots/create.webp) |
| **Show page with its RSS feed**                                                                            | **Creator profile**                                                                                      |
| ![Show "Cuadernos de viaje" with its episodes and the Copy RSS link button](.github/screenshots/show.webp) | ![Profile with bio, link, followers and the Following button](.github/screenshots/profile.webp)          |

<p align="center">
  <img src=".github/screenshots/mobile.webp" alt="On mobile: Home with the docked player, and the expanded Now playing view" width="560">
</p>

## Tech stack

| Layer          | Technology                                                                              |
| -------------- | --------------------------------------------------------------------------------------- |
| Frontend       | Next.js 16 (App Router), React 19, strict TypeScript                                    |
| UI             | Tailwind CSS v4, shadcn/ui, Motion, Zustand (player state)                              |
| Forms          | React Hook Form + Zod, with the same rules the server enforces                          |
| Backend        | Convex: database, queries and mutations, actions, file storage, full-text search, crons |
| Authentication | Convex Auth (Google and email with password)                                            |
| Voice          | Google Cloud Text-to-Speech, Chirp 3 HD voices                                          |
| Covers         | Cloudflare Workers AI, FLUX.1 schnell                                                   |
| Scripts        | Gemini API                                                                              |
| Hosting        | Vercel (frontend) and Convex (backend)                                                  |

## Architecture

```
Browser ── Next.js on Vercel ───── reactive queries and mutations ───► Convex
              │                                                        │
              └ RSS feed, covers and audio for directories             ├─ database and search
                                                                       ├─ file storage (audio, covers, photos)
                                                                       ├─ crons (orphaned file cleanup)
                                                                       └─ actions ──► Google TTS · Workers AI · Gemini
```

- Every call to an AI provider happens in a Convex action. API keys live in Convex environment variables and never reach the client.
- Every public function validates its arguments. Functions that write data or spend AI quota check the session, and those that modify a show or an episode check that the user is its author.
- The database stores file ids, not URLs: queries resolve them on read.
- Daily per-user quotas for audio, covers and scripts, a global monthly cap on TTS characters, and hourly limits on sign-ups, profile edits, follows and plays.

## Zero cost

Everything runs on free tiers: Vercel Hobby, Convex Free, the Gemini API without billing, Cloudflare Workers AI within its daily allowance, and Cloud Text-to-Speech within the one million free Chirp 3 HD characters per month. The app enforces its own limits below those quotas.

## Local development

Requirements: Node.js 24 LTS and free accounts on Convex, Google Cloud, Google AI Studio and Cloudflare.

```bash
npm install
npx convex dev        # creates the development deployment and writes .env.local
npm run dev           # in another terminal: http://localhost:3000
```

Backend keys are set in Convex, not in `.env.local`:

```bash
npx @convex-dev/auth                              # SITE_URL, JWT_PRIVATE_KEY and JWKS
npx convex env set AUTH_GOOGLE_ID <id>            # callback: https://<deployment>.convex.site/api/auth/callback/google
npx convex env set AUTH_GOOGLE_SECRET <secret>
npx convex env set GOOGLE_TTS_API_KEY <key>       # Google Cloud project with billing, TTS API only
npx convex env set CLOUDFLARE_ACCOUNT_ID <id>
npx convex env set CLOUDFLARE_API_TOKEN <token>   # Workers AI permission
npx convex env set GEMINI_API_KEY <key>           # AI Studio project without billing
```

The full template is in `.env.example`.

| Script              | What it does                                           |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Next.js in development mode                            |
| `npx convex dev`    | Syncs the Convex functions and regenerates their types |
| `npm test`          | Vitest tests for the pure logic                        |
| `npm run typecheck` | Next.js route types and `tsc --noEmit`                 |
| `npm run lint`      | ESLint                                                 |
| `npm run format`    | Prettier                                               |
| `npm run build`     | Production build                                       |

## Quality

- 113 Vitest tests on the logic shared by client and server: form rules, the conversation parser, the RSS feed, VTT captions, audio, and block-based hiding.
- Lighthouse accessibility score of 100 on every public route, also checked with axe in signed-in states; visible focus, 44 px targets and `prefers-reduced-motion`.
- Feed validated with the W3C Feed Validator.

## Status

Finished project: all 23 planned phases are in production. Left out on purpose, for cost or scope: payments, voice cloning, asynchronous generation for long episodes, advanced analytics, a light theme and interface localization.

## Author

Alonso Vera (Rickety Major)
