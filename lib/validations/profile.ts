import { z } from "zod";

import { bioError, displayNameError, websiteError } from "@/convex/lib/profile";

// Same rules as users.updateProfile (convex/lib/profile.ts), one per field.
const rule = (error: (value: string) => string | null) =>
  z.string().superRefine((value, ctx) => {
    const message = error(value);
    if (message) ctx.addIssue({ code: "custom", message });
  });

export const profileFormSchema = z.object({
  displayName: rule(displayNameError),
  bio: rule(bioError),
  website: rule(websiteError),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
