import { describe, expect, it } from "vitest";

import { sameSource } from "../components/create/GeneratePodcast";
import {
  conversationIssues,
  hostsOf,
  podcastFormSchema,
  type PodcastFormValues,
} from "../lib/validations/podcast";

const source = {
  script: "Hola.",
  languageCode: "es-US",
  voiceName: "Charon",
  speakingRate: "1",
  spokenDisclosure: true,
  format: "narration",
  voice2Name: "Aoede",
  hostNames: ["Charon", "Aoede"],
} satisfies Parameters<typeof sameSource>[0];

const talk = {
  ...source,
  format: "conversation",
  script: "Martín: Hola, Lucía.\nLucía: Hola, Martín.",
  hostNames: ["Martín", "Lucía"],
} satisfies Parameters<typeof sameSource>[0];

describe("sameSource", () => {
  it("marks the audio stale when the AI notice is switched", () => {
    expect(sameSource(source, { ...source })).toBe(true);
    expect(sameSource(source, { ...source, spokenDisclosure: false })).toBe(
      false,
    );
  });
  it("ignores voice 2 and the names in narration", () => {
    expect(
      sameSource(source, {
        ...source,
        voice2Name: "Puck",
        hostNames: ["A", "B"],
      }),
    ).toBe(true);
  });
  it("marks the audio stale when the format, voice 2 or a name changes", () => {
    expect(sameSource(talk, { ...talk })).toBe(true);
    expect(sameSource(talk, { ...talk, format: "narration" })).toBe(false);
    expect(sameSource(talk, { ...talk, voice2Name: "Puck" })).toBe(false);
    expect(sameSource(talk, { ...talk, hostNames: ["Martín", "Lucy"] })).toBe(
      false,
    );
    expect(
      sameSource(talk, { ...talk, hostNames: [" Martín ", "Lucía"] }),
    ).toBe(true);
  });
});

describe("conversationIssues", () => {
  it("has nothing to say about narration", () => {
    expect(conversationIssues({ ...source, hostNames: ["", ""] })).toEqual([]);
  });
  it("accepts a valid conversation", () => {
    expect(conversationIssues(talk)).toEqual([]);
  });
  it("points each problem at its field", () => {
    expect(
      conversationIssues({ ...talk, hostNames: ["Martín", "R2"] }),
    ).toEqual([
      {
        path: ["hostNames", 1],
        message:
          "Usa hasta 20 letras, espacios, ' o -, empezando por una letra.",
      },
    ]);
    expect(
      conversationIssues({ ...talk, hostNames: ["Ana", "ana"] }),
    ).toContainEqual({
      path: ["hostNames", 1],
      message: "Usa dos nombres distintos.",
    });
    expect(conversationIssues({ ...talk, voice2Name: "Charon" })).toEqual([
      { path: ["voice2Name"], message: "Elige dos voces distintas." },
    ]);
    expect(
      conversationIssues({ ...talk, script: "Martín: Hola a todos." }),
    ).toEqual([
      { path: ["script"], message: "Usa las dos voces o cambia a Narración." },
    ]);
  });
});

describe("podcastFormSchema", () => {
  const values: PodcastFormValues = {
    ...talk,
    showId: "show1",
    title: "Café",
    description: "Una conversación sobre café.",
    script: `${talk.script}\nMartín: Y el tueste lo cambia todo, ¿verdad?`,
  };
  it("checks the conversation with the rest of the form", () => {
    expect(podcastFormSchema.safeParse(values).success).toBe(true);
    const result = podcastFormSchema.safeParse({
      ...values,
      voice2Name: "Charon",
    });
    expect(result.error?.issues.map((i) => i.path.join("."))).toEqual([
      "voice2Name",
    ]);
  });
});

describe("hostsOf", () => {
  it("is undefined for narration and pairs names with voices otherwise", () => {
    expect(hostsOf(source)).toBeUndefined();
    expect(hostsOf({ ...talk, hostNames: [" Martín ", "Lucía"] })).toEqual([
      { name: "Martín", voiceName: "Charon" },
      { name: "Lucía", voiceName: "Aoede" },
    ]);
  });
});
