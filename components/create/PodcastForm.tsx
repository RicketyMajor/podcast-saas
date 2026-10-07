"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import {
  CreateStages,
  currentStage,
  type Stage,
} from "@/components/create/CreateStages";
import { HostFields } from "@/components/create/HostFields";
import { ScriptDialog } from "@/components/create/ScriptDialog";
import type { PodcastDetailData } from "@/components/podcast/PodcastDetailHeader";
import { VoiceSelect } from "@/components/create/VoiceSelect";
import { PillButton } from "@/components/shared/PillButton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import {
  DEFAULT_VOICE_NAME,
  LANGUAGES,
  secondVoiceFor,
} from "@/convex/ai/voices";
import {
  DEFAULT_SPEAKING_RATE,
  SCRIPT_MAX_CHARS,
  SPEAKING_RATES,
} from "@/convex/lib/limits";
import {
  hostNameError,
  hostNamesError,
  parseDialogue,
  renameSpeaker,
  sameName,
} from "@/convex/lib/dialogue";
import { useLeaveWarning } from "@/hooks/use-leave-warning";
import { SPEAKING_RATE_LABELS } from "@/lib/constants";
import { cn, errorMessage, formatCount } from "@/lib/utils";
import {
  conversationIssues,
  hostsOf,
  podcastFormSchema,
  type PodcastFormValues,
} from "@/lib/validations/podcast";
import { usePageCover } from "@/stores/ambient-store";

const CONTROL = "h-11";
const SELECT_TRIGGER = "h-11 w-full data-[size=default]:h-11";
// Fieldsets default to min-width: min-content; long unbroken text would overflow.
const FIELDSET = "min-w-0";
const LEGEND =
  // data-[variant=legend]: beats shadcn's own legend size without editing ui/.
  "mb-5 font-display text-[1.375rem] font-bold tracking-[-0.025em] data-[variant=legend]:text-[1.375rem]";
// A stage the rail scrolls to: clears the sticky rail and takes focus.
const STAGE =
  "flex scroll-mt-40 flex-col gap-10 outline-none sm:scroll-mt-32 lg:scroll-mt-24";

export type ShowOption = FunctionReturnType<
  typeof api.shows.getByAuthor
>[number];

/** Without `podcast` it creates one; with it, it edits that podcast. */
export function PodcastForm({
  defaultTitle = "",
  defaultShowId,
  shows,
  podcast,
}: {
  defaultTitle?: string;
  defaultShowId?: string;
  /** The author's shows (at least one): an episode always belongs to one. */
  shows: ShowOption[];
  podcast?: PodcastDetailData;
}) {
  const router = useRouter();
  const createPodcast = useMutation(api.podcasts.create);
  const updatePodcast = useMutation(api.podcasts.update);
  const editing = podcast !== undefined;
  const initialShow = shows.find(
    (s) =>
      s._id ===
      (podcast?.showId ??
        defaultShowId ??
        (shows.length === 1 ? shows[0]?._id : undefined)),
  );
  const [host1, host2] = podcast?.hosts ?? [];
  const voice1 = podcast?.voiceName ?? DEFAULT_VOICE_NAME;
  const voice2 = host2?.voiceName ?? secondVoiceFor(voice1);
  const hostDefaults: Pick<
    PodcastFormValues,
    "format" | "voice2Name" | "hostNames"
  > = {
    format: host1 && host2 ? "conversation" : "narration",
    voice2Name: voice2 as PodcastFormValues["voice2Name"],
    // Until the creator names them, hosts go by their voice's name.
    hostNames: [host1?.name ?? voice1, host2?.name ?? voice2],
  };
  // Stored values passed validation on publish, so the casts hold.
  const defaults: PodcastFormValues = podcast
    ? {
        showId: initialShow?._id ?? "",
        title: podcast.title,
        description: podcast.description,
        languageCode: podcast.languageCode as PodcastFormValues["languageCode"],
        voiceName: podcast.voiceName as PodcastFormValues["voiceName"],
        speakingRate: String(podcast.speakingRate),
        script: podcast.transcript,
        spokenDisclosure: podcast.spokenDisclosure,
        ...hostDefaults,
      }
    : {
        showId: initialShow?._id ?? "",
        title: defaultTitle,
        description: "",
        languageCode: (initialShow?.languageCode ??
          "es-US") as PodcastFormValues["languageCode"],
        voiceName: DEFAULT_VOICE_NAME,
        speakingRate: String(DEFAULT_SPEAKING_RATE),
        script: "",
        spokenDisclosure: true,
        ...hostDefaults,
      };
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    getFieldState,
    trigger,
    formState: { isValid, isSubmitting, isDirty, isSubmitSuccessful },
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
  // null = the episode uses its show's cover (an inherited one has no source).
  const [image, setImage] = useState<Thumbnail | null>(() =>
    podcast?.imageUrl && podcast.imageSource
      ? {
          url: podcast.imageUrl,
          source: podcast.imageSource,
          prompt: podcast.imagePrompt,
        }
      : null,
  );
  const [
    showId,
    title,
    description,
    script,
    languageCode,
    voiceName,
    speakingRate,
    spokenDisclosure,
    format,
    voice2Name,
    hostNames,
  ] = useWatch({
    control,
    name: [
      "showId",
      "title",
      "description",
      "script",
      "languageCode",
      "voiceName",
      "speakingRate",
      "spokenDisclosure",
      "format",
      "voice2Name",
      "hostNames",
    ],
  });
  const show = shows.find((s) => s._id === showId);
  const audioReady =
    audio !== null &&
    sameSource(audio.source, {
      script,
      languageCode,
      voiceName,
      speakingRate,
      spokenDisclosure,
      format,
      voice2Name,
      hostNames,
    });
  const canPublish = isValid && audioReady;
  // The cover you make (or the show's) lights the room, like a playing one would.
  usePageCover(image?.url ?? show?.imageUrl);

  const conversation = format === "conversation";
  const conversationReady =
    conversationIssues({ format, script, voiceName, voice2Name, hostNames })
      .length === 0;
  // Back in narration, a script still labeled for the hosts voices the names.
  const labeledNarration =
    !conversation &&
    hostNamesError(hostNames) === null &&
    parseDialogue(script, hostNames).ok;

  // Conversation rules span fields: recheck the ones already showing errors,
  // and voice 2 always (a select has no half-typed state to wait out).
  function revalidateConversation() {
    const shown = (
      ["hostNames.0", "hostNames.1", "voice2Name", "script"] as const
    ).filter((name) => name === "voice2Name" || getFieldState(name).isTouched);
    if (shown.length > 0) void trigger(shown);
  }

  // A renamed host keeps its lines: "Charon:" becomes "Martín:" in the
  // script. Renames start from the last usable name, so passing through an
  // empty or repeated one on the way doesn't strand the old labels.
  // A copy: the published audio's source keeps the original names.
  const labelNames = useRef<[string, string]>([...defaults.hostNames]);
  // Whenever the script reads right with the current names, those names are
  // its labels: a generated or hand-edited script resyncs them.
  useEffect(() => {
    if (
      hostNamesError(hostNames) === null &&
      parseDialogue(script, hostNames).ok
    ) {
      labelNames.current = [hostNames[0].trim(), hostNames[1].trim()];
    }
  }, [script, hostNames]);
  function renameHost(index: 0 | 1, to: string) {
    setValue(`hostNames.${index}`, to, { shouldDirty: true });
    const otherIndex = index === 0 ? 1 : 0;
    // Never onto the other host's name or its labels: that would merge them.
    if (
      hostNameError(to) ||
      sameName(to, getValues(`hostNames.${otherIndex}`)) ||
      sameName(to, labelNames.current[otherIndex])
    ) {
      return;
    }
    const from = labelNames.current[index];
    labelNames.current[index] = to;
    const current = getValues("script");
    const renamed = renameSpeaker(current, from, to);
    if (renamed !== current) {
      setValue("script", renamed, { shouldDirty: true });
    }
  }

  const { shape } = podcastFormSchema;
  const stages: Stage[] = [
    {
      target: "stage-script",
      label: "Guion",
      status:
        show !== undefined &&
        shape.title.safeParse(title).success &&
        shape.description.safeParse(description).success &&
        shape.script.safeParse(script).success &&
        conversationReady
          ? "done"
          : "todo",
    },
    {
      target: "stage-voice",
      label: "Voz",
      status: audioReady ? "done" : audio ? "stale" : "todo",
    },
    {
      target: "stage-cover",
      label: "Portada",
      // The show's cover counts: an episode doesn't need its own.
      status: image || show ? "done" : "todo",
    },
    { target: "stage-publish", label: "Publicar", status: "todo" },
  ];
  const current = currentStage(stages);
  const action = editing ? "guardar" : "publicar";
  const publishHelp = !audioReady
    ? `Genera el audio con el guion actual para ${action}.`
    : !isValid
      ? "Revisa los campos marcados."
      : null;

  // New files carry a storageId; the published ones being edited don't.
  useLeaveWarning(
    !isSubmitSuccessful &&
      (isDirty ||
        audio?.storageId !== undefined ||
        image?.storageId !== undefined),
  );

  const onSubmit = handleSubmit(async (values) => {
    if (!audio || !audioReady || !show) return;
    const fields = {
      showId: show._id,
      title: values.title,
      description: values.description,
      transcript: values.script,
      languageCode: values.languageCode,
      voiceName: values.voiceName,
      speakingRate: Number(values.speakingRate),
      imagePrompt: image?.prompt,
      hosts: hostsOf(values),
    };
    try {
      if (podcast) {
        await updatePodcast({
          ...fields,
          podcastId: podcast._id,
          audioStorageId: audio.storageId,
          // undefined keeps the published cover; null drops an own one.
          imageStorageId:
            image?.storageId ??
            (image === null && podcast.imageSource ? null : undefined),
        });
        toast.success("Cambios guardados.");
        router.push(`/podcasts/${podcast._id}`);
      } else {
        if (!audio.storageId) return;
        const podcastId = await createPodcast({
          ...fields,
          audioStorageId: audio.storageId,
          imageStorageId: image?.storageId,
        });
        toast.success("¡Episodio publicado!");
        router.push(`/podcasts/${podcastId}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      <CreateStages stages={stages} />

      <section
        id="stage-script"
        tabIndex={-1}
        aria-label="Guion"
        className={STAGE}
      >
        <FieldSet className={FIELDSET}>
          <FieldLegend className={LEGEND}>Detalles</FieldLegend>
          <FieldGroup>
            <Controller
              name="showId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="showId">Show</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // A new episode starts in its show's language; an
                      // edited one keeps the language its audio was voiced in.
                      const picked = shows.find((s) => s._id === value);
                      if (!editing && picked) {
                        setValue(
                          "languageCode",
                          picked.languageCode as PodcastFormValues["languageCode"],
                          { shouldDirty: true, shouldValidate: true },
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      id="showId"
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      aria-describedby="showId-help"
                      className={SELECT_TRIGGER}
                    >
                      <SelectValue placeholder="Elige un show" />
                    </SelectTrigger>
                    <SelectContent>
                      {shows.map((option) => (
                        <SelectItem key={option._id} value={option._id}>
                          {option.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription id="showId-help">
                    El episodio se publica dentro de este show.{" "}
                    <Link
                      href="/shows/new?next=create"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Crear un show nuevo
                    </Link>
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
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
                      aria-describedby="languageCode-help"
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
                  <FieldDescription id="languageCode-help">
                    El guion con IA y las voces disponibles siguen este idioma.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSet className={FIELDSET}>
          <FieldLegend className={LEGEND}>Guion</FieldLegend>
          <Controller
            name="format"
            control={control}
            render={({ field }) => (
              <FieldSet className={FIELDSET}>
                <FieldLegend variant="label">Formato</FieldLegend>
                <RadioGroup
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    revalidateConversation();
                  }}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {(
                    [
                      ["narration", "Narración", "Una voz lee el guion."],
                      [
                        "conversation",
                        "Conversación",
                        "Dos voces con nombre se turnan.",
                      ],
                    ] as const
                  ).map(([value, title, help]) => (
                    <FieldLabel key={value} htmlFor={`format-${value}`}>
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle id={`format-${value}-title`}>
                            {title}
                          </FieldTitle>
                          <FieldDescription id={`format-${value}-help`}>
                            {help}
                          </FieldDescription>
                        </FieldContent>
                        {/* A radio is a <button>: name it explicitly, a
                            wrapping <label> doesn't count for every reader. */}
                        <RadioGroupItem
                          value={value}
                          id={`format-${value}`}
                          aria-labelledby={`format-${value}-title`}
                          aria-describedby={`format-${value}-help`}
                        />
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              </FieldSet>
            )}
          />
          {conversation && (
            // Hosts sit further apart than a host's own voice and name, and
            // arrive with a short rise so the new fields don't just pop in.
            <div className="flex animate-in flex-col gap-8 duration-300 ease-out-expo fade-in-0 motion-safe:slide-in-from-bottom-2 sm:gap-5">
              {([0, 1] as const).map((index) => (
                <HostFields
                  key={index}
                  control={control}
                  index={index}
                  languageCode={languageCode}
                  onRename={renameHost}
                  onChange={revalidateConversation}
                />
              ))}
            </div>
          )}
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
                  <FieldLabel htmlFor="script">
                    {conversation
                      ? "Texto que leerán las voces"
                      : "Texto que leerá la voz"}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="script"
                    rows={12}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      conversation || labeledNarration
                        ? "script-help script-count"
                        : "script-count"
                    }
                    // The format, shown with the hosts' own names.
                    placeholder={
                      conversation
                        ? `${hostNames[0]}: Hola, ${hostNames[1]}. ¿De qué hablamos hoy?\n${hostNames[1]}: Del tueste del café, ${hostNames[0]}.`
                        : undefined
                    }
                    className="min-h-64"
                  />
                  <div className="flex items-start gap-4">
                    {(conversation || labeledNarration) && (
                      <FieldDescription
                        id="script-help"
                        // Side by side with the counter, not stacked above it.
                        className="nth-last-2:mt-0"
                      >
                        {conversation
                          ? "Cada intervención empieza con «Nombre:». Las líneas sin nombre siguen con la misma voz."
                          : "Este guion tiene los nombres de las voces: en Narración también se leerán en voz alta."}
                      </FieldDescription>
                    )}
                    <FieldDescription
                      id="script-count"
                      className={cn(
                        "ml-auto shrink-0 text-right tabular-nums",
                        length > SCRIPT_MAX_CHARS && "text-destructive",
                      )}
                    >
                      {formatCount(length)} / {formatCount(SCRIPT_MAX_CHARS)}
                    </FieldDescription>
                  </div>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              );
            }}
          />
        </FieldSet>
      </section>

      <section
        id="stage-voice"
        tabIndex={-1}
        aria-label="Voz"
        className={STAGE}
      >
        <FieldSet className={FIELDSET}>
          <FieldLegend className={LEGEND}>Voz y audio</FieldLegend>
          <FieldGroup>
            <div
              className={cn(
                "grid gap-5",
                conversation
                  ? "sm:grid-cols-2"
                  : "sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
              )}
            >
              {/* In a conversation, voice 1 lives with its name in Guion. */}
              {!conversation && (
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
              )}
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
              name="spokenDisclosure"
              control={control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Checkbox
                    id="spokenDisclosure"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    onBlur={field.onBlur}
                    aria-describedby="spokenDisclosure-help"
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="spokenDisclosure">
                      Incluir aviso hablado de IA
                    </FieldLabel>
                    <FieldDescription id="spokenDisclosure-help">
                      Apple Podcasts lo exige. Suma una frase breve al inicio
                      del audio.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />
            <GeneratePodcast
              control={control}
              audio={audio}
              onAudioChange={setAudio}
              primary={current === 1}
            />
          </FieldGroup>
        </FieldSet>
      </section>

      <section
        id="stage-cover"
        tabIndex={-1}
        aria-label="Portada"
        className={STAGE}
      >
        <FieldSet className={FIELDSET}>
          <FieldLegend className={LEGEND}>Portada</FieldLegend>
          <GenerateThumbnail
            image={image}
            onImageChange={setImage}
            primary={current === 2}
            fallbackUrl={show?.imageUrl}
          />
        </FieldSet>
      </section>

      <section
        id="stage-publish"
        tabIndex={-1}
        aria-label="Publicar"
        className="flex scroll-mt-40 flex-col items-stretch gap-3 border-t border-foreground/8 pt-8 outline-none sm:scroll-mt-32 sm:items-end lg:scroll-mt-24"
      >
        <PillButton
          type="submit"
          tone={current === 3 ? "primary" : "glass"}
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
              : "Publicar episodio"}
        </PillButton>
        {publishHelp && (
          <p id="publish-help" className="text-sm text-muted-foreground">
            {publishHelp}
          </p>
        )}
      </section>
    </form>
  );
}
