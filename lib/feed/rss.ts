import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";
import { disclosureOf } from "@/convex/ai/voices";
import { parseDialogue } from "@/convex/lib/dialogue";

import type { Segment } from "./vtt";
import { cdata, escapeXml as e } from "./xml";

export type Feed = NonNullable<FunctionReturnType<typeof api.shows.getFeed>>;

// Plural: Waves voices one or two hosts (phase 21).
export const AI_NOTE = "Voces generadas con IA en Waves.";

export const feedPath = (showId: string) => `/shows/${showId}/feed.xml`;
export const transcriptPath = (podcastId: string, ext: "txt" | "vtt") =>
  `/podcasts/${podcastId}/transcript.${ext}`;
// Directory-ready files, named after their storage id: a new file is a new
// URL (Spotify only re-downloads a new URL) and the path still ends in its
// extension (Apple). The routes serve only the current version.
export const coverPath = (
  kind: "shows" | "podcasts",
  id: string,
  version: string,
) => `/${kind}/${id}/cover/${version}.jpg`;
export const audioPath = (podcastId: string, version: string) =>
  `/podcasts/${podcastId}/audio/${version}.mp3`;

/** "<storageId>.jpg" → "<storageId>"; null if the extension is wrong. */
export const versionOf = (file: string, ext: ".jpg" | ".mp3") =>
  file.endsWith(ext) ? file.slice(0, -ext.length) : null;

/**
 * What the audio says: the spoken AI notice first, when it has one.
 * ponytail: rebuilt from today's phrase (convex/ai/voices.ts); rewording a
 * phrase would desync older episodes' transcripts, so store the voiced text
 * on the generation and the podcast before ever changing one.
 */
export function voicedText(
  transcript: string,
  languageCode: string,
  spokenDisclosure: boolean,
  speaker?: string, // a conversation's first host, who voices the notice
) {
  const notice = spokenDisclosure ? disclosureOf(languageCode) : "";
  if (!notice) return transcript;
  return `${speaker ? `${speaker}: ` : ""}${notice}\n\n${transcript}`;
}

type Voiced = {
  transcript: string;
  languageCode: string;
  spokenDisclosure: boolean;
  hosts: { name: string }[] | null;
};

/** Who says what, in order: one segment in narration, one per turn otherwise. */
export function voicedSegments(ep: Voiced): Segment[] {
  const narration = () => [
    { text: voicedText(ep.transcript, ep.languageCode, ep.spokenDisclosure) },
  ];
  const [first, second] = ep.hosts ?? [];
  if (!first || !second) return narration();
  const names = [first.name, second.name] as const;
  const dialogue = parseDialogue(ep.transcript, names);
  if (!dialogue.ok) return narration(); // stored scripts parsed on publish
  const notice = ep.spokenDisclosure ? disclosureOf(ep.languageCode) : "";
  return [
    ...(notice ? [{ speaker: names[0], text: notice }] : []),
    ...dialogue.turns.map((t) => ({ speaker: names[t.speaker], text: t.text })),
  ];
}

// Paragraphs split like TranscriptView: blank lines.
const html = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${e(p)}</p>`)
    .join("");

// A conversation names each speaker; narration keeps its paragraphs.
const transcriptHtml = (segments: Segment[]) =>
  segments
    .map((s) =>
      s.speaker
        ? `<p><strong>${e(s.speaker)}:</strong> ${e(s.text)}</p>`
        : html(s.text),
    )
    .join("");

const date = (ms: number) => new Date(ms).toUTCString();

/** RSS 2.0 + iTunes + Podcasting 2.0 tags for a show with episodes. */
export function buildFeed(feed: Feed, origin: string): string {
  const showUrl = `${origin}/shows/${feed._id}`;
  const coverUrl = origin + coverPath("shows", feed._id, feed.imageStorageId);
  // Spotify mails its ownership code to itunes:email; the lock's owner can
  // unlock a move to another host. No email: neither tag.
  const owner = feed.directoryEmail
    ? [
        `<itunes:owner><itunes:name>${e(feed.authorName)}</itunes:name><itunes:email>${e(feed.directoryEmail)}</itunes:email></itunes:owner>`,
        `<podcast:locked owner="${e(feed.directoryEmail)}">yes</podcast:locked>`,
      ]
    : [];
  const newest = feed.episodes[0];
  const items = feed.episodes.map((ep) => {
    const transcript = (ext: "txt" | "vtt", type: string, rel = "") =>
      `<podcast:transcript url="${e(origin + transcriptPath(ep._id, ext))}" type="${type}" language="${e(ep.languageCode)}"${rel} />`;
    return [
      "<item>",
      `<title>${e(ep.title)}</title>`,
      `<guid isPermaLink="false">${ep._id}</guid>`,
      `<link>${e(`${origin}/podcasts/${ep._id}`)}</link>`,
      `<pubDate>${date(ep._creationTime)}</pubDate>`,
      `<description>${e(`${ep.description}\n\n${AI_NOTE}`)}</description>`,
      `<content:encoded>${cdata(`${html(ep.description)}<p>${AI_NOTE}</p><h3>Transcripción</h3>${transcriptHtml(voicedSegments(ep))}`)}</content:encoded>`,
      `<enclosure url="${e(origin + audioPath(ep._id, ep.audioStorageId))}" length="${ep.audioSize}" type="${e(ep.audioType)}" />`,
      `<itunes:duration>${Math.round(ep.audioDurationSec)}</itunes:duration>`,
      ep.imageStorageId
        ? `<itunes:image href="${e(origin + coverPath("podcasts", ep._id, ep.imageStorageId))}" />`
        : "",
      transcript("txt", "text/plain"),
      transcript("vtt", "text/vtt", ' rel="captions"'),
      "</item>",
    ]
      .filter(Boolean)
      .join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    `<title>${e(feed.title)}</title>`,
    `<link>${e(showUrl)}</link>`,
    `<atom:link href="${e(origin + feedPath(feed._id))}" rel="self" type="application/rss+xml" />`,
    `<description>${e(`${feed.description}\n\n${AI_NOTE}`)}</description>`,
    `<language>${e(feed.languageCode)}</language>`,
    "<generator>Waves</generator>",
    newest
      ? `<lastBuildDate>${date(newest._creationTime)}</lastBuildDate>`
      : "",
    `<itunes:author>${e(feed.authorName)}</itunes:author>`,
    ...owner,
    `<itunes:image href="${e(coverUrl)}" />`,
    `<image><url>${e(coverUrl)}</url><title>${e(feed.title)}</title><link>${e(showUrl)}</link></image>`,
    `<itunes:category text="${e(feed.category)}" />`,
    `<itunes:explicit>${feed.explicit}</itunes:explicit>`,
    "<itunes:type>episodic</itunes:type>",
    ...items,
    "</channel>",
    "</rss>",
  ]
    .filter(Boolean)
    .join("\n")
    .concat("\n");
}
