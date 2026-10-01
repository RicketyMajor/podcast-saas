"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  GeneratePodcast,
  sameSource,
  type GeneratedAudio,
} from "@/components/create/GeneratePodcast";
import {
  GenerateThumbnail,
  type Thumbnail,
} from "@/components/create/GenerateThumbnail";
import { ScriptDialog } from "@/components/create/ScriptDialog";
import type { PodcastDetailData } from "@/components/podcast/PodcastDetailHeader";
import { VoiceSelect } from "@/components/create/VoiceSelect";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { DEFAULT_VOICE_NAME, LANGUAGES } from "@/convex/ai/voices";
import {
  DEFAULT_SPEAKING_RATE,
  SCRIPT_MAX_CHARS,
  SPEAKING_RATES,
} from "@/convex/lib/limits";
import { SPEAKING_RATE_LABELS } from "@/lib/constants";
import { cn, formatCount } from "@/lib/utils";
import {
  podcastFormSchema,
  type PodcastFormValues,
} from "@/lib/validations/podcast";

const CONTROL = "h-10";
const SELECT_TRIGGER = "h-10 w-full data-[size=default]:h-10";
// Fieldsets default to min-width: min-content; long unbroken text would overflow.
const FIELDSET = "min-w-0";
const LEGEND = "mb-4 text-lg font-semibold tracking-tight";

/** Without `podcast` it creates one; with it, it edits that podcast. */
export function PodcastForm({
  defaultTitle = "",
  podcast,
}: {
  defaultTitle?: string;
  podcast?: PodcastDetailData;
}) {
  const router = useRouter();
  const createPodcast = useMutation(api.podcasts.create);
  const updatePodcast = useMutation(api.podcasts.update);
  const editing = podcast !== undefined;
  // Stored values passed validation on publish, so the casts hold.
  const defaults: PodcastFormValues = podcast
    ? {
        title: podcast.title,
        description: podcast.description,
        languageCode: podcast.languageCode as PodcastFormValues["languageCode"],
        voiceName: podcast.voiceName as PodcastFormValues["voiceName"],
        speakingRate: String(podcast.speakingRate),
        script: podcast.transcript,
      }
    : {
        title: defaultTitle,
        description: "",
        languageCode: "es-US",
        voiceName: DEFAULT_VOICE_NAME,
        speakingRate: String(DEFAULT_SPEAKING_RATE),
        script: "",
      };
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid, isSubmitting },
  } = useForm<PodcastFormValues>({
    resolver: zodResolver(podcastFormSchema),
    mode: "onTouched",
    defaultValues: defaults,
  });

  // When editing, start from the published files (no storageId = keep them).
  const [audio, setAudio] = useState<GeneratedAudio | null>(() =>
    podcast?.audioUrl
      ? {
          url: podcast.audioUrl,
          durationSec: podcast.audioDurationSec,
          source: defaults,
        }
      : null,
  );
  const [image, setImage] = useState<Thumbnail | null>(() =>
    podcast?.imageUrl
      ? {
          url: podcast.imageUrl,
          source: podcast.imageSource,
          prompt: podcast.imagePrompt,
        }
      : null,
  );
  const [script, languageCode, voiceName, speakingRate] = useWatch({
    control,
    name: ["script", "languageCode", "voiceName", "speakingRate"],
  });
  const audioReady =
    audio !== null &&
    sameSource(audio.source, { script, languageCode, voiceName, speakingRate });
  const canPublish = isValid && audioReady && image !== null;
  const action = editing ? "guardar" : "publicar";
  const publishHelp = !audioReady
    ? `Genera el audio con el guion actual para ${action}.`
    : image === null
      ? `Agrega una portada para ${action}.`
      : !isValid
        ? "Revisa los campos marcados."
        : null;

  const onSubmit = handleSubmit(async (values) => {
    if (!audio || !audioReady || !image) return;
    const fields = {
      title: values.title,
      description: values.description,
      transcript: values.script,
      languageCode: values.languageCode,
      voiceName: values.voiceName,
      speakingRate: Number(values.speakingRate),
      imagePrompt: image.prompt,
    };
    try {
      if (podcast) {
        await updatePodcast({
          ...fields,
          podcastId: podcast._id,
          audioStorageId: audio.storageId,
          imageStorageId: image.storageId,
        });
        toast.success("Cambios guardados.");
        router.push(`/podcasts/${podcast._id}`);
      } else {
        if (!audio.storageId || !image.storageId) return;
        const podcastId = await createPodcast({
          ...fields,
          audioStorageId: audio.storageId,
          imageStorageId: image.storageId,
        });
        toast.success("¡Podcast publicado!");
        router.push(`/podcasts/${podcastId}`);
      }
    } catch (err) {
      toast.error(
        err instanceof ConvexError
          ? String((err.data as { message?: string }).message)
          : "Algo salió mal. Inténtalo de nuevo.",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      <FieldSet className={FIELDSET}>
        <FieldLegend className={LEGEND}>Detalles</FieldLegend>
        <FieldGroup>
          <Controller
            name="title"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="title">Título</FieldLabel>
                <Input
                  {...field}
                  id="title"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  className={CONTROL}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="description">Descripción</FieldLabel>
                <Textarea
                  {...field}
                  id="description"
                  rows={3}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="description-help"
                />
                <FieldDescription id="description-help">
                  De qué trata el episodio, en una o dos frases.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              name="languageCode"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="languageCode">Idioma</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="languageCode"
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      className={SELECT_TRIGGER}
                    >
                      <SelectValue placeholder="Elige un idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                          {language.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="speakingRate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="speakingRate">Velocidad</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="speakingRate"
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      className={SELECT_TRIGGER}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPEAKING_RATES.map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>
                          {SPEAKING_RATE_LABELS[rate]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <Controller
            name="voiceName"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="voiceName">Voz</FieldLabel>
                <VoiceSelect
                  id="voiceName"
                  value={field.value}
                  languageCode={languageCode}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet className={FIELDSET}>
        <FieldLegend className={LEGEND}>Guion</FieldLegend>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Escríbelo tú o pide un borrador a la IA.
          </p>
          <ScriptDialog
            control={control}
            onGenerated={(script) =>
              setValue("script", script, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          />
        </div>
        <Controller
          name="script"
          control={control}
          render={({ field, fieldState }) => {
            const length = field.value.length;
            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="script">Texto que leerá la voz</FieldLabel>
                <Textarea
                  {...field}
                  id="script"
                  rows={12}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="script-count"
                  className="min-h-64"
                />
                <FieldDescription
                  id="script-count"
                  className={cn(
                    "text-right tabular-nums",
                    length > SCRIPT_MAX_CHARS && "text-destructive",
                  )}
                >
                  {formatCount(length)} / {formatCount(SCRIPT_MAX_CHARS)}
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            );
          }}
        />
      </FieldSet>

      <FieldSet className={FIELDSET}>
        <FieldLegend className={LEGEND}>Audio</FieldLegend>
        <GeneratePodcast
          control={control}
          audio={audio}
          onAudioChange={setAudio}
        />
      </FieldSet>

      <FieldSet className={FIELDSET}>
        <FieldLegend className={LEGEND}>Portada</FieldLegend>
        <GenerateThumbnail image={image} onImageChange={setImage} />
      </FieldSet>

      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <Button
          type="submit"
          size="lg"
          disabled={!canPublish || isSubmitting}
          aria-describedby={publishHelp ? "publish-help" : undefined}
        >
          {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
          {editing
            ? isSubmitting
              ? "Guardando…"
              : "Guardar cambios"
            : isSubmitting
              ? "Publicando…"
              : "Publicar podcast"}
        </Button>
        {publishHelp && (
          <p id="publish-help" className="text-sm text-muted-foreground">
            {publishHelp}
          </p>
        )}
      </div>
    </form>
  );
}
