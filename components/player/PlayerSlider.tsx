"use client";

import { Slider as SliderPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// Wraps the Radix primitive instead of components/ui/slider because the
// thumb (role="slider") needs its own aria-label and aria-valuetext.
// The range takes the ambient color: it is literally "what you hear".
export function PlayerSlider({
  value,
  max,
  step,
  label,
  valueText,
  onValueChange,
  onValueCommit,
  className,
}: {
  value: number;
  max: number;
  step: number;
  label: string;
  valueText?: string;
  onValueChange: (value: number) => void;
  onValueCommit?: (value: number) => void;
  className?: string;
}) {
  return (
    <SliderPrimitive.Root
      value={[value]}
      max={max}
      step={step}
      onValueChange={(values) => onValueChange(values[0] ?? 0)}
      onValueCommit={(values) => onValueCommit?.(values[0] ?? 0)}
      className={cn(
        "group relative flex h-4 touch-none items-center select-none",
        className,
      )}
    >
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-foreground/15 transition-[height] duration-150 group-hover:h-1.5">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-ambient" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        aria-valuetext={valueText}
        className="block size-3.5 scale-50 rounded-full bg-foreground opacity-0 shadow-md ring-ring/50 transition-[opacity,scale] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100 focus-visible:scale-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:outline-hidden"
      />
    </SliderPrimitive.Root>
  );
}
