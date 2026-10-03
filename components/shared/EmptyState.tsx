import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  as: Title = "h2",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** "h1" when the empty state is the whole page (404, error, not found). */
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-foreground/15 px-6 py-14 text-center sm:py-20">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-foreground/8">
        <Icon aria-hidden className="size-6" />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <Title className="text-[1.375rem] leading-tight font-bold tracking-[-0.025em] text-balance">
          {title}
        </Title>
        {description && (
          <p className="text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className="mt-1 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {action}
        </div>
      )}
    </div>
  );
}
