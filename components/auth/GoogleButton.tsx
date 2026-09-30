"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function GoogleButton({
  redirectTo,
  disabled,
}: {
  redirectTo: string;
  disabled?: boolean;
}) {
  const { signIn } = useAuthActions();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      // Navigates to Google; the page unloads on success.
      await signIn("google", { redirectTo });
    } catch {
      toast.error("No pudimos conectar con Google. Inténtalo de nuevo.");
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={onClick}
      disabled={disabled || pending}
    >
      {pending && <Loader2 aria-hidden className="animate-spin" />}
      Continuar con Google
    </Button>
  );
}
