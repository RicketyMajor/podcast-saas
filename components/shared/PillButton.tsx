import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PILL = {
  // The view's main action: the brightest thing on screen (DESIGN.md).
  primary:
    "h-12 rounded-full px-7 text-base shadow-lg shadow-black/30 transition-transform active:scale-95 [&_svg:not([class*='size-'])]:size-5",
  glass:
    "h-12 rounded-full border-foreground/20 bg-background/30 px-6 text-base backdrop-blur-md transition-transform active:scale-95",
} as const;

/** shadcn Button in the Waves pill shapes; wraps instead of editing ui/. */
export function PillButton({
  tone = "primary",
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "variant" | "size"> & {
  tone?: keyof typeof PILL;
}) {
  return (
    <Button
      variant={tone === "glass" ? "outline" : "default"}
      className={cn(PILL[tone], className)}
      {...props}
    />
  );
}
