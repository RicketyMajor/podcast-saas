import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";

import { cdata, escapeXml as e } from "./xml";

export type Feed = NonNullable<FunctionReturnType<typeof api.shows.getFeed>>;

export const AI_NOTE = "Voz generada con IA en Waves.";

export const feedPath = (showId: string) => `/shows/${showId}/feed.xml`;
export const transcriptPath = (podcastId: string, ext: "txt" | "vtt") =>
  `/podcasts/${podcastId}/transcript.${ext}`;

// Paragraphs split like TranscriptView: blank lines.
const html = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${e(p)}</p>`)
    .join("");

const date = (ms: number) => new Date(ms).toUTCString();

/** RSS 2.0 + iTunes + Podcasting 2.0 tags for a show with episodes. */
export function buildFeed(feed: Feed, origin: string): string {
  const showUrl = `${origin}/shows/${feed._id}`;
  const cover = feed.imageUrl
    ? [
        `<itunes:image href="${e(feed.imageUrl)}" />`,
        `<image><url>${e(feed.imageUrl)}</url><title>${e(feed.title)}</title><link>${e(showUrl)}</link></image>`,
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
      `<content:encoded>${cdata(`${html(ep.description)}<p>${AI_NOTE}</p><h3>Transcripción</h3>${html(ep.transcript)}`)}</content:encoded>`,
      `<enclosure url="${e(ep.audioUrl)}" length="${ep.audioSize}" type="${e(ep.audioType)}" />`,
      `<itunes:duration>${Math.round(ep.audioDurationSec)}</itunes:duration>`,
      ep.imageUrl ? `<itunes:image href="${e(ep.imageUrl)}" />` : "",
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
    ...cover,
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
