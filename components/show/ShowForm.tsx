"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  GenerateThumbnail,
  type Thumbnail,
} from "@/components/create/GenerateThumbnail";
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
import { LANGUAGES } from "@/convex/ai/voices";
import { SHOW_CATEGORIES } from "@/convex/lib/limits";
import { useLeaveWarning } from "@/hooks/use-leave-warning";
import { errorMessage } from "@/lib/utils";
import { showFormSchema, type ShowFormValues } from "@/lib/validations/show";
import { usePageCover } from "@/stores/ambient-store";

import type { ShowDetailData } from "./ShowHeader";

const CONTROL = "h-11";
const SELECT_TRIGGER = "h-11 w-full data-[size=default]:h-11";
const FIELDSET = "min-w-0";
const LEGEND =
  "mb-5 font-display text-[1.375rem] font-bold tracking-[-0.025em] data-[variant=legend]:text-[1.375rem]";

/**
 * Without `show` it creates one; with it, it edits that show. `next="create"`
 * sends a new show straight back to the create form with it picked. `email`
 * is the show's directory email, which only its author can read.
 */
export function ShowForm({
  show,
  email,
  next,
}: {
  show?: ShowDetailData;
  email?: string | null;
  next?: "create";
}) {
  const router = useRouter();
  const createShow = useMutation(api.shows.create);
  const updateShow = useMutation(api.shows.update);
  // Stored values passed validation on create, so the casts hold.
  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting, isDirty, isSubmitSuccessful },
  } = useForm<ShowFormValues>({
    resolver: zodResolver(showFormSchema),
    mode: "onTouched",
    defaultValues: show
      ? {
          title: show.title,
          description: show.description,
          languageCode: show.languageCode as ShowFormValues["languageCode"],
          category: show.category as ShowFormValues["category"],
          explicit: show.explicit,
          directoryEmail: email ?? "",
        }
      : {
          title: "",
          description: "",
          languageCode: "es-US",
          category: undefined,
          explicit: false,
          directoryEmail: "",
        },
  });

  // When editing, start from the published cover (no storageId = keep it).
  const [image, setImage] = useState<Thumbnail | null>(() =>
    show?.imageUrl
      ? {
          url: show.imageUrl,
          source: show.imageSource,
          prompt: show.imagePrompt,
        }
      : null,
  );
  usePageCover(image?.url);
  useLeaveWarning(
    !isSubmitSuccessful && (isDirty || image?.storageId !== undefined),
  );

  const canSubmit = isValid && image !== null;
  const help =
    image === null
      ? `Agrega una portada para ${show ? "guardar" : "crear el show"}.`
      : !isValid
        ? "Revisa los campos marcados."
        : null;

  const onSubmit = handleSubmit(async (values) => {
    if (!image) return;
    const fields = { ...values, imagePrompt: image.prompt };
    try {
      if (show) {
        await updateShow({
          ...fields,
          showId: show._id,
          imageStorageId: image.storageId,
        });
        toast.success("Cambios guardados.");
        router.push(`/shows/${show._id}`);
      } else {
        if (!image.storageId) return;
        const showId = await createShow({
          ...fields,
          imageStorageId: image.storageId,
        });
        toast.success("¡Show creado!");
        router.push(
          next === "create"
            ? `/create-podcast?show=${showId}`
            : `/shows/${showId}`,
        );
      }
    } catch (err) {
      toast.error(errorMessage(err));
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
                <FieldLabel htmlFor="show-title">Título</FieldLabel>
                <Input
                  {...field}
                  id="show-title"
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
                <FieldLabel htmlFor="show-description">Descripción</FieldLabel>
                <Textarea
                  {...field}
                  id="show-description"
                  rows={3}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="show-description-help"
                />
                <FieldDescription id="show-description-help">
                  De qué trata el show, en una o dos frases.
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
                  <FieldLabel htmlFor="show-language">Idioma</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="show-language"
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      aria-describedby="show-language-help"
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
                  <FieldDescription id="show-language-help">
                    Sus episodios nuevos empiezan en este idioma.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="category"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="show-category">Categoría</FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="show-category"
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      className={SELECT_TRIGGER}
                    >
                      <SelectValue placeholder="Elige una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOW_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
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
            name="explicit"
            control={control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  id="show-explicit"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  onBlur={field.onBlur}
                  aria-describedby="show-explicit-help"
                />
                <FieldContent>
                  <FieldLabel htmlFor="show-explicit">
                    Contenido explícito
                  </FieldLabel>
                  <FieldDescription id="show-explicit-help">
                    Márcalo si hay lenguaje o temas para adultos. Apple Podcasts
                    y Spotify piden indicarlo.
                  </FieldDescription>
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            name="directoryEmail"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="show-email">
                  Email para directorios (opcional)
                </FieldLabel>
                <Input
                  {...field}
                  id="show-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={fieldState.invalid}
                  aria-describedby="show-email-help"
                  className={CONTROL}
                />
                <FieldDescription id="show-email-help">
                  Será público en el feed. Spotify lo usa para verificar que el
                  show es tuyo; puedes usar un alias.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet className={FIELDSET}>
        <FieldLegend className={LEGEND}>Portada</FieldLegend>
        <GenerateThumbnail
          image={image}
          onImageChange={setImage}
          primary={image === null}
        />
      </FieldSet>

      <div className="flex flex-col items-stretch gap-3 border-t border-foreground/8 pt-8 sm:items-end">
        <PillButton
          type="submit"
          tone={image ? "primary" : "glass"}
          disabled={!canSubmit || isSubmitting}
          aria-describedby={help ? "show-submit-help" : undefined}
        >
          {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
          {show
            ? isSubmitting
              ? "Guardando…"
              : "Guardar cambios"
            : isSubmitting
              ? "Creando…"
              : "Crear show"}
        </PillButton>
        {help && (
          <p id="show-submit-help" className="text-sm text-muted-foreground">
            {help}
          </p>
        )}
      </div>
    </form>
  );
}
