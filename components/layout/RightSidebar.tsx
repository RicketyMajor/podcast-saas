import { FeaturedCarousel } from "@/components/layout/FeaturedCarousel";
import { TopCreators } from "@/components/layout/TopCreators";
import { UserCard } from "@/components/layout/UserCard";
import { PlayerSpacer } from "@/components/player/PlayerSpacer";

// ponytail: hidden with CSS below xl, so its queries also run on small
// screens; mount it only at xl (matchMedia) if those subscriptions matter.
export function RightSidebar() {
  return (
    <aside
      aria-label="Destacados y creadores"
      className="sticky top-0 hidden h-dvh w-78 shrink-0 flex-col overflow-y-auto border-l border-foreground/8 xl:flex"
    >
      <div className="flex flex-col gap-8 px-5 py-6">
        <UserCard />
        <FeaturedCarousel />
        <TopCreators />
      </div>
      <PlayerSpacer />
    </aside>
  );
}
