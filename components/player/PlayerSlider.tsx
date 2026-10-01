"use client";

import { Slider as SliderPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// Wraps the Radix primitive instead of components/ui/slider because the
// thumb (role="slider") needs its own aria-label and aria-valuetext.
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
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        aria-valuetext={valueText}
        className="block size-3 rounded-full bg-primary opacity-0 ring-ring/50 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:outline-hidden"
      />
    </SliderPrimitive.Root>
  );
}
