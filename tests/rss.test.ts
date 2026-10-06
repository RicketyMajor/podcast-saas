import { describe, expect, it } from "vitest";

import type { Id } from "../convex/_generated/dataModel";
import { buildFeed, versionOf, voicedText, type Feed } from "../lib/feed/rss";
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
  audioStorageId: `audio-${id}` as Id<"_storage">,
  audioSize: 1234,
  audioType: "audio/mpeg",
  imageStorageId: null,
  spokenDisclosure: false,
  hosts: null,
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
  imageStorageId: "cover" as Id<"_storage">,
  directoryEmail: null,
  episodes: [
    episode("ep2", Date.UTC(2026, 9, 4), {
      imageStorageId: "own" as Id<"_storage">,
      spokenDisclosure: true,
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
      '<enclosure url="https://waves.test/podcasts/ep2/audio/audio-ep2.mp3" length="1234" type="audio/mpeg" />',
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
    expect(xml).toContain(
      "<h3>Transcripción</h3><p>Este episodio fue creado con voces generadas por inteligencia artificial.</p><p>Hola.</p><p>Adiós.</p>",
    );
    expect(xml).toContain("<h3>Transcripción</h3><p>Hola.</p><p>Adiós.</p>"); // ep1, no notice
  });
});

describe("buildFeed for directories", () => {
  it("points covers at the directory routes, versioned by file", () => {
    expect(xml).toContain(
      '<itunes:image href="https://waves.test/shows/show1/cover/cover.jpg" />',
    );
    expect(xml).toContain(
      "<image><url>https://waves.test/shows/show1/cover/cover.jpg</url>",
    );
    expect(xml).toContain(
      '<itunes:image href="https://waves.test/podcasts/ep2/cover/own.jpg" />',
    );
  });

  it("declares no owner and no lock without an email", () => {
    expect(xml).not.toContain("<itunes:owner>");
    expect(xml).not.toContain("<podcast:locked");
  });

  it("declares the owner and locks the feed with an email", () => {
    const owned = buildFeed(
      { ...feed, directoryEmail: "ana@waves.test" },
      "https://waves.test",
    );
    expect(owned).toContain(
      "<itunes:owner><itunes:name>Ana</itunes:name><itunes:email>ana@waves.test</itunes:email></itunes:owner>",
    );
    expect(owned).toContain(
      '<podcast:locked owner="ana@waves.test">yes</podcast:locked>',
    );
  });
});

describe("voicedText", () => {
  it("opens with the spoken notice only when the audio has it", () => {
    expect(voicedText("Hola.", "en-US", true)).toBe(
      "This episode was created with AI-generated voices.\n\nHola.",
    );
    expect(voicedText("Hola.", "en-US", false)).toBe("Hola.");
  });
});

describe("versionOf", () => {
  it("reads the storage id from a directory file name", () => {
    expect(versionOf("kg2abc.jpg", ".jpg")).toBe("kg2abc");
    expect(versionOf("kg2abc.mp3", ".mp3")).toBe("kg2abc");
  });
  it("rejects the wrong extension", () => {
    expect(versionOf("kg2abc.png", ".jpg")).toBeNull();
    expect(versionOf("kg2abc", ".mp3")).toBeNull();
  });
});
