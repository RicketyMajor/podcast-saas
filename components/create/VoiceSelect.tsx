"use client";

import { Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VOICES } from "@/convex/ai/voices";

export function VoiceSelect({
  id,
  value,
  languageCode,
  onChange,
  onBlur,
  invalid,
}: {
  id: string;
  value: string;
  languageCode: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid: boolean;
}) {
  // Short static sample, not a podcast: the global player rule doesn't apply.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const sample = `/voices/${languageCode}-${value}.mp3`;

  // Stop the sample when the voice or language changes, and on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      setPlaying(false);
    };
  }, [sample]);

  function toggleSample() {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    const audio = (audioRef.current ??= new Audio());
    audio.src = sample;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          onBlur={onBlur}
          aria-invalid={invalid}
          className="h-10 w-full min-w-0 data-[size=default]:h-10"
        >
          <SelectValue placeholder="Elige una voz" />
        </SelectTrigger>
        <SelectContent>
          {VOICES.map((voice) => (
            <SelectItem key={voice.name} value={voice.name} className="py-2">
              <span className="font-medium">{voice.name}</span>
              <span className="text-muted-foreground">{voice.description}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-10 shrink-0"
        disabled={!value}
        onClick={toggleSample}
        aria-label={
          playing ? "Detener muestra" : `Escuchar muestra de la voz ${value}`
        }
        aria-pressed={playing}
      >
        {playing ? <Square aria-hidden /> : <Play aria-hidden />}
      </Button>
    </div>
  );
}
