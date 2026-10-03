import { ConnectionBanner } from "@/components/layout/ConnectionBanner";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { PlayerSpacer } from "@/components/player/PlayerSpacer";
import { PodcastPlayer } from "@/components/player/PodcastPlayer";

export default function RootGroupLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <LeftSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <ConnectionBanner />
        <main
          id="main"
          tabIndex={-1}
          className="flex flex-1 flex-col px-4 py-8 outline-none lg:px-10 lg:py-10"
        >
          {children}
        </main>
        <PlayerSpacer />
      </div>
      <RightSidebar />
      <PodcastPlayer />
    </div>
  );
}
