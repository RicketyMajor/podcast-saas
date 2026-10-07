"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ImageUp, Loader2, LogIn, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { PillButton } from "@/components/shared/PillButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  BIO_MAX_CHARS,
  COVER_TYPES,
  DISPLAY_NAME_MAX_CHARS,
  UPLOAD_MAX_MB,
  WEBSITE_MAX_CHARS,
} from "@/convex/lib/limits";
import { useLeaveWarning } from "@/hooks/use-leave-warning";
import { uploadFile } from "@/lib/upload";
import { cn, errorMessage, formatCount } from "@/lib/utils";
import { ANONYMOUS_NAME, oneLine } from "@/convex/lib/profile";
import { coverFileError } from "@/lib/validations/podcast";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/lib/validations/profile";

type Settings = NonNullable<FunctionReturnType<typeof api.users.getSettings>>;
// "keep" = the saved photo; a new upload previews from its local blob URL.
type Photo = "keep" | "remove" | { storageId: Id<"_storage">; url: string };

const CONTROL = "h-11";
const FIELDSET = "min-w-0";
const LEGEND =
  "mb-5 font-display text-[1.375rem] font-bold tracking-[-0.025em] data-[variant=legend]:text-[1.375rem]";

export function ProfileForm() {
  const settings = useQuery(api.users.getSettings);
  if (settings === undefined) return <ProfileFormSkeleton />;
  // proxy.ts already sends visitors to /sign-in; this covers an expired session.
  if (settings === null) {
    return (
      <EmptyState
        icon={LogIn}
        title="Inicia sesión para editar tu perfil"
        action={
          <PillButton asChild>
            <Link href="/sign-in?redirectTo=%2Fsettings">Iniciar sesión</Link>
          </PillButton>
        }
      />
    );
  }
  return <Form settings={settings} />;
}

function Form({ settings }: { settings: Settings }) {
  const router = useRouter();
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [photo, setPhoto] = useState<Photo>("keep");
  const [uploading, setUploading] = useState(false);
  // "Quitar foto" disappears once used: focus moves to the upload control.
  const fileInput = useRef<HTMLInputElement>(null);
  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: "onTouched",
    // Blank unless they chose a name: the account's shows as placeholder, so
    // a long Google name never blocks saving the other fields.
    defaultValues: {
      displayName: settings.displayName,
      bio: settings.bio,
      website: settings.website,
    },
  });
  const [displayName, bio] = useWatch({
    control,
    name: ["displayName", "bio"],
  });

  const changed = isDirty || photo !== "keep";
  // router.push isn't blocked by it: only links and reloads ask.
  useLeaveWarning(changed);

  // Free the local preview when it's replaced or the form goes away.
  const blobUrl = typeof photo === "object" ? photo.url : null;
  useEffect(
    () => () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    },
    [blobUrl],
  );

  const ownPhoto =
    typeof photo === "object" ||
    (photo === "keep" && settings.avatarUrl !== null);
  const preview =
    typeof photo === "object"
      ? photo.url
      : photo === "keep"
        ? (settings.avatarUrl ?? settings.accountImageUrl)
        : settings.accountImageUrl;
  // Same fallback as authorNameOf, so the preview matches the saved profile.
  const initial = (displayName.trim() || settings.accountName || ANONYMOUS_NAME)
    .charAt(0)
    .toUpperCase();
  const bioLength = oneLine(bio).length;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const invalid = coverFileError(file);
    if (invalid) return void toast.error(invalid);
    setUploading(true);
    try {
      const storageId = await uploadFile(await generateUploadUrl(), file);
      setPhoto({ storageId, url: URL.createObjectURL(file) });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateProfile({
        ...values,
        avatar: typeof photo === "object" ? photo.storageId : photo,
      });
      toast.success("Perfil actualizado.");
      router.push(`/profile/${settings._id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      <FieldSet className={FIELDSET}>
        <FieldLegend className={LEGEND}>Perfil</FieldLegend>
        <FieldGroup>
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <Avatar className="size-24 shadow-xl ring-1 shadow-black/40 ring-foreground/10">
              {preview && <AvatarImage src={preview} alt="" />}
              <AvatarFallback className="text-4xl font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <div className="flex flex-wrap justify-center gap-2">
                <PillButton
                  asChild
                  tone="glass"
                  className={cn(
                    "h-11 cursor-pointer has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
                    uploading && "pointer-events-none opacity-60",
                  )}
                >
                  <label>
                    {uploading ? (
                      <Loader2 aria-hidden className="animate-spin" />
                    ) : (
                      <ImageUp aria-hidden />
                    )}
                    {uploading
                      ? "Subiendo…"
                      : ownPhoto
                        ? "Cambiar foto"
                        : "Subir foto"}
                    <input
                      ref={fileInput}
                      type="file"
                      accept={COVER_TYPES.join(",")}
                      className="sr-only"
                      disabled={uploading || isSubmitting}
                      aria-describedby="profile-photo-help"
                      onChange={(event) => {
                        void handleFile(event.target.files?.[0]);
                        event.target.value = ""; // allow the same file again
                      }}
                    />
                  </label>
                </PillButton>
                {ownPhoto && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-full px-4 text-muted-foreground"
                    disabled={uploading || isSubmitting}
                    onClick={() => {
                      setPhoto("remove");
                      fileInput.current?.focus();
                    }}
                  >
                    <Trash2 aria-hidden />
                    Quitar foto
                  </Button>
                )}
              </div>
              <p
                id="profile-photo-help"
                className="text-sm text-muted-foreground"
              >
                PNG, JPG o WebP · hasta {UPLOAD_MAX_MB} MB · cuadrada se ve
                mejor.
              </p>
            </div>
          </div>

          <Controller
            name="displayName"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-name">Nombre</FieldLabel>
                <Input
                  {...field}
                  id="profile-name"
                  autoComplete="name"
                  placeholder={settings.accountName || ANONYMOUS_NAME}
                  maxLength={DISPLAY_NAME_MAX_CHARS}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="profile-name-help"
                  className={CONTROL}
                />
                <FieldDescription id="profile-name-help">
                  Así te ven en tu perfil, tus shows y tus episodios. Si lo
                  dejas vacío, usamos el nombre de tu cuenta.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="bio"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-bio">Bio (opcional)</FieldLabel>
                <Textarea
                  {...field}
                  id="profile-bio"
                  rows={3}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="profile-bio-count"
                />
                <FieldDescription
                  id="profile-bio-count"
                  className={cn(
                    "text-right tabular-nums",
                    bioLength > BIO_MAX_CHARS && "text-destructive",
                  )}
                >
                  {formatCount(bioLength)} / {formatCount(BIO_MAX_CHARS)}
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="website"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-website">
                  Enlace (opcional)
                </FieldLabel>
                <Input
                  {...field}
                  id="profile-website"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://tusitio.com"
                  maxLength={WEBSITE_MAX_CHARS}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="profile-website-help"
                  className={CONTROL}
                />
                <FieldDescription id="profile-website-help">
                  Tu web o una red social. Aparece en tu perfil.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-col items-stretch gap-3 border-t border-foreground/8 pt-8 sm:items-end">
        <PillButton
          type="submit"
          tone={changed ? "primary" : "glass"}
          disabled={!changed || !isValid || uploading || isSubmitting}
        >
          {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
          {isSubmitting ? "Guardando…" : "Guardar cambios"}
        </PillButton>
      </div>
    </form>
  );
}

function ProfileFormSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando perfil"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-11 w-40 rounded-full" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}
