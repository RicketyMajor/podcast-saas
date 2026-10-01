import { describe, expect, it } from "vitest";

import type { Id } from "../convex/_generated/dataModel";
import { usePlayerStore, type Track } from "../stores/player-store";

const track = (id: string): Track => ({
  podcastId: id as Id<"podcasts">,
  title: id,
  authorId: "u" as Id<"users">,
  authorName: "Autor",
  imageUrl: null,
  audioUrl: `https://x.convex.cloud/api/storage/${id}`,
  durationSec: 100,
});

function fakeAudio() {
  const calls: string[] = [];
  const audio = {
    src: "",
    paused: true,
    currentTime: 0,
    duration: 100,
    volume: 1,
    muted: false,
    play: () => (calls.push(`play ${audio.src}`), Promise.resolve()),
    pause: () => calls.push("pause"),
    removeAttribute: () => (audio.src = ""),
    load: () => {},
  };
  usePlayerStore.getState().bindAudio(audio as unknown as HTMLAudioElement);
  return { audio, calls };
}

describe("player store", () => {
  it("loads a new track, and resumes (no reload) when it's the same one", () => {
    const { audio, calls } = fakeAudio();
    const { play } = usePlayerStore.getState();
    play(track("a"));
    audio.currentTime = 40;
    play(track("a"));
    expect(audio.currentTime).toBe(40);
    play(track("b"));
    expect(usePlayerStore.getState().track?.podcastId).toBe("b");
    expect(calls).toEqual([
      `play ${track("a").audioUrl}`,
      `play ${track("a").audioUrl}`,
      `play ${track("b").audioUrl}`,
    ]);
  });

  it("clamps seek and skip to the audio length", () => {
    const { audio } = fakeAudio();
    const { seek, skip } = usePlayerStore.getState();
    seek(150);
    expect(audio.currentTime).toBe(100);
    skip(-500);
    expect(audio.currentTime).toBe(0);
  });

  it("close clears the track and unloads the audio", () => {
    const { audio } = fakeAudio();
    usePlayerStore.getState().play(track("c"));
    usePlayerStore.getState().close();
    expect(usePlayerStore.getState().track).toBeNull();
    expect(audio.src).toBe("");
  });
});
