"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VOICES } from "@/convex/ai/voices";

// ponytail: sample ▶ button lands with phase 5 (P1) once samples exist.
export function VoiceSelect({
  id,
  value,
  onChange,
  onBlur,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        onBlur={onBlur}
        aria-invalid={invalid}
        className="h-10 w-full data-[size=default]:h-10"
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
  );
}
