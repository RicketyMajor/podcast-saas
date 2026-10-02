import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { PlayerSpacer } from "@/components/player/PlayerSpacer";
import { PodcastPlayer } from "@/components/player/PodcastPlayer";

export default function RootGroupLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <LeftSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="flex flex-1 flex-col px-4 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
        <PlayerSpacer />
      </div>
      <RightSidebar />
      <PodcastPlayer />
    </div>
  );
}
