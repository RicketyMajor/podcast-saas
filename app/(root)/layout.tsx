import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default function RootGroupLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <LeftSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        {/* ponytail: phase 8 adds bottom padding here while the player is visible. */}
        <main className="flex flex-1 flex-col px-4 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
      {/* Reserved for RightSidebar (phase 10). */}
      <aside
        aria-hidden
        className="hidden w-78 shrink-0 border-l border-border xl:block"
      />
    </div>
  );
}
