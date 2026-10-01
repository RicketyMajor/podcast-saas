import { create } from "zustand";

import type { Id } from "@/convex/_generated/dataModel";

export type Track = {
  podcastId: Id<"podcasts">;
  title: string;
  authorName: string;
  imageUrl: string | null;
  audioUrl: string;
  durationSec: number;
};

type PlayerState = {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number; // 0..1
  muted: boolean;
  play: (track: Track) => void; // same track → resumes
  pause: () => void;
  toggle: () => void;
  seek: (sec: number) => void;
  skip: (deltaSec: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  close: () => void;
  /** PodcastPlayer registers its <audio>; its events write state back. */
  bindAudio: (audio: HTMLAudioElement | null) => void;
};

// The <audio> element is the source of truth: actions drive it and its events
// (see PodcastPlayer) report isPlaying and currentTime, so they never drift.
// Module-level store is safe: it's only written on the client.
let audio: HTMLAudioElement | null = null;

const playAudio = () => {
  // A rejected play() (autoplay policy, aborted load) just leaves it paused.
  audio?.play().catch(() => {});
};

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  track: null,
  isPlaying: false,
  currentTime: 0,
  volume: 1,
  muted: false,

  play: (track) => {
    if (get().track?.podcastId === track.podcastId) {
      playAudio();
      return;
    }
    set({ track, currentTime: 0 });
    if (audio) {
      audio.src = track.audioUrl;
      playAudio();
    }
  },
  pause: () => audio?.pause(),
  toggle: () => (audio?.paused ? playAudio() : audio?.pause()),
  seek: (sec) => {
    if (!audio) return;
    const max = Number.isFinite(audio.duration)
      ? audio.duration
      : (get().track?.durationSec ?? 0);
    audio.currentTime = Math.min(Math.max(sec, 0), max);
    set({ currentTime: audio.currentTime });
  },
  skip: (deltaSec) => get().seek((audio?.currentTime ?? 0) + deltaSec),
  setVolume: (volume) => {
    if (audio) {
      audio.volume = volume;
      audio.muted = volume === 0;
    }
    set({ volume, muted: volume === 0 });
  },
  toggleMute: () => {
    const muted = !get().muted;
    if (audio) audio.muted = muted;
    set({ muted });
  },
  close: () => {
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    set({ track: null, isPlaying: false, currentTime: 0 });
  },
  bindAudio: (element) => {
    audio = element;
  },
}));
