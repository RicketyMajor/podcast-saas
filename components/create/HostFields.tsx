"use client";

import { Controller, useWatch, type Control } from "react-hook-form";

import { VoiceSelect } from "@/components/create/VoiceSelect";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { HOST_NAME_MAX_CHARS } from "@/convex/lib/limits";
import type { PodcastFormValues } from "@/lib/validations/podcast";

/** One host of a conversation: its voice and the name its lines start with. */
export function HostFields({
  control,
  index,
  languageCode,
  onRename,
  onChange,
}: {
  control: Control<PodcastFormValues>;
  index: 0 | 1;
  languageCode: string;
  /** Set the host's name and rewrite its labels in the script. */
  onRename: (index: 0 | 1, to: string) => void;
  /** Something the conversation rules depend on changed. */
  onChange: () => void;
}) {
  const voiceField = index === 0 ? "voiceName" : "voice2Name";
  const nameField = `hostNames.${index}` as const;
  const name = useWatch({ control, name: nameField });
  const n = index + 1;

  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Controller
        name={voiceField}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={voiceField}>Voz {n}</FieldLabel>
            <VoiceSelect
              id={voiceField}
              value={field.value}
              languageCode={languageCode}
              onChange={(voice) => {
                // The name follows the voice until the creator edits it.
                if (name.trim() === field.value) onRename(index, voice);
                field.onChange(voice);
                onChange();
              }}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <Controller
        name={nameField}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`host-name-${n}`}>Nombre {n}</FieldLabel>
            <Input
              {...field}
              id={`host-name-${n}`}
              autoComplete="off"
              spellCheck={false}
              maxLength={HOST_NAME_MAX_CHARS}
              aria-invalid={fieldState.invalid}
              className="h-11"
              // Labels in the script follow once the name is settled.
              onBlur={() => {
                field.onBlur();
                onRename(index, field.value);
                onChange();
              }}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </div>
  );
}
