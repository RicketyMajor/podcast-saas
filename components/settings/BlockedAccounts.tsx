"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  UserRow,
  UserRowsSkeleton,
  type UserRowData,
} from "@/components/profile/UserRow";
import { PillButton } from "@/components/shared/PillButton";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/utils";

const PAGE_SIZE = 20; // users.ts USER_PAGE_MAX

export function BlockedAccounts() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.users.getBlocked,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <section
      aria-labelledby="blocked-accounts"
      // Space, not a rule: the form above already closes on its own hairline.
      className="flex flex-col gap-4 pt-8"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="blocked-accounts"
          className="font-display text-[1.375rem] font-bold tracking-[-0.025em]"
        >
          Cuentas bloqueadas
        </h2>
        <p className="text-sm text-muted-foreground">
          No pueden seguirte y, con la sesión iniciada, ninguno ve el contenido
          del otro.
        </p>
      </div>
      {status === "LoadingFirstPage" ? (
        <UserRowsSkeleton label="Cargando cuentas bloqueadas" />
      ) : results.length === 0 && status === "Exhausted" ? (
        <p className="text-muted-foreground">No has bloqueado a nadie.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {results.map((user) => (
            <UserRow key={user._id} user={user}>
              <UnblockButton user={user} />
            </UserRow>
          ))}
        </ul>
      )}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <PillButton
          tone="glass"
          className="h-11 self-center"
          disabled={status === "LoadingMore"}
          onClick={() => loadMore(PAGE_SIZE)}
        >
          {status === "LoadingMore" && (
            <Loader2 aria-hidden className="animate-spin" />
          )}
          Cargar más
        </PillButton>
      )}
    </section>
  );
}

function UnblockButton({ user }: { user: UserRowData }) {
  const unblock = useMutation(api.users.unblock);
  const [pending, setPending] = useState(false);

  async function handleUnblock() {
    setPending(true);
    try {
      await unblock({ userId: user._id });
      toast.success(`Desbloqueaste a ${user.name}.`);
    } catch (err) {
      toast.error(errorMessage(err));
      setPending(false); // on success the row goes away
    }
  }

  return (
    <Button
      variant="outline"
      className="h-11 shrink-0 rounded-full px-4"
      disabled={pending}
      onClick={handleUnblock}
      aria-label={`Desbloquear a ${user.name}`}
    >
      {pending && <Loader2 aria-hidden className="animate-spin" />}
      Desbloquear
    </Button>
  );
}
