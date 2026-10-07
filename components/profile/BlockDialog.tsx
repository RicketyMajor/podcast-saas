"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/utils";

export function BlockDialog({
  user,
  open,
  onOpenChange,
}: {
  user: { _id: Id<"users">; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const block = useMutation(api.users.block);

  async function handleBlock() {
    try {
      await block({ userId: user._id });
      onOpenChange(false);
      toast.success(`Bloqueaste a ${user.name}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`¿Bloquear a ${user.name}?`}
      description="Dejarán de seguirse y no podrán volver a hacerlo. Con la sesión iniciada, ninguno verá el perfil, los shows ni los episodios del otro. Puedes desbloquear cuando quieras."
      confirmLabel="Bloquear"
      pendingLabel="Bloqueando…"
      onConfirm={handleBlock}
    />
  );
}
