import { Hourglass } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { EMPTY_STATES } from "@/lib/constants";

// Placeholder for routes whose phase hasn't landed yet.
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader as="h1" title={title} />
      <EmptyState icon={Hourglass} {...EMPTY_STATES.comingSoon} />
    </div>
  );
}
