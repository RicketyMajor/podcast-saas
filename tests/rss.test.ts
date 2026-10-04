import { describe, expect, it } from "vitest";

import type { Id } from "../convex/_generated/dataModel";
import { buildFeed, type Feed } from "../lib/feed/rss";
import { cdata, escapeXml } from "../lib/feed/xml";

const episode = (
  id: string,
  at: number,
  extra: Partial<Feed["episodes"][number]> = {},
) => ({
  _id: id as Id<"podcasts">,
  _creationTime: at,
  title: `Episodio ${id}`,
  description: "Una descripción.",
  transcript: "Hola.\n\nAdiós.",
  languageCode: "es-US",
  audioDurationSec: 61.6,
  audioUrl: `https://x.convex.cloud/api/storage/${id}`,
  audioSize: 1234,
  audioType: "audio/mpeg",
  imageUrl: null,
  ...extra,
});

const feed: Feed = {
  _id: "show1" as Id<"shows">,
  title: "Café & <Té> \u0007show",
  description: "Un show.",
  authorName: "Ana",
  languageCode: "es-US",
  category: "Society & Culture",
  explicit: false,
  imageUrl: "https://x.convex.cloud/api/storage/cover",
  episodes: [
    episode("ep2", Date.UTC(2026, 9, 4), {
      imageUrl: "https://x.convex.cloud/api/storage/own",
    }),
    episode("ep1", Date.UTC(2026, 9, 1)),
  ],
};
const xml = buildFeed(feed, "https://waves.test");

describe("escapeXml / cdata", () => {
  it("escapes markup and drops XML-invalid control characters", () => {
    expect(escapeXml(`a & <b> "c" 'd'\u0007`)).toBe(
      "a &amp; &lt;b&gt; &quot;c&quot; &apos;d&apos;",
    );
  });
  it("splits a literal ]]> across two CDATA sections", () => {
    expect(cdata("a]]>b")).toBe("<![CDATA[a]]]]><![CDATA[>b]]>");
  });
});

describe("buildFeed", () => {
  it("escapes user text in channel tags", () => {
    expect(xml).toContain("<title>Café &amp; &lt;Té&gt; show</title>");
    expect(xml).toContain('<itunes:category text="Society &amp; Culture" />');
  });
  it("declares itself, its show and the AI voice", () => {
    expect(xml).toContain(
      '<atom:link href="https://waves.test/shows/show1/feed.xml" rel="self" type="application/rss+xml" />',
    );
    expect(xml).toContain("<link>https://waves.test/shows/show1</link>");
    expect(xml).toContain("<itunes:explicit>false</itunes:explicit>");
    expect(xml).toContain(
      "Un show.\n\nVoz generada con IA en Waves.</description>",
    );
  });
  it("lists episodes newest first with stable guids and real enclosures", () => {
    expect(xml.indexOf('<guid isPermaLink="false">ep2</guid>')).toBeLessThan(
      xml.indexOf('<guid isPermaLink="false">ep1</guid>'),
    );
    expect(xml).toContain(
      '<enclosure url="https://x.convex.cloud/api/storage/ep2" length="1234" type="audio/mpeg" />',
    );
    expect(xml).toContain("<itunes:duration>62</itunes:duration>");
    expect(xml).toContain(
      `<pubDate>${new Date(Date.UTC(2026, 9, 4)).toUTCString()}</pubDate>`,
    );
  });
  it("adds an episode image only when the episode has its own cover", () => {
    expect(xml.match(/<itunes:image href=/g)).toHaveLength(2); // channel + ep2
  });
  it("links both transcripts and ships the script as show notes", () => {
    expect(xml).toContain(
      '<podcast:transcript url="https://waves.test/podcasts/ep2/transcript.txt" type="text/plain" language="es-US" />',
    );
    expect(xml).toContain(
      '<podcast:transcript url="https://waves.test/podcasts/ep2/transcript.vtt" type="text/vtt" language="es-US" rel="captions" />',
    );
    expect(xml).toContain("<h3>Transcripción</h3><p>Hola.</p><p>Adiós.</p>");
  });
});
