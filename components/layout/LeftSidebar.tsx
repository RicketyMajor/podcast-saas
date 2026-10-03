import { AuthButton } from "@/components/layout/AuthButton";
import { LegalLinks } from "@/components/layout/LegalLinks";
import { Logo } from "@/components/layout/Logo";
import { NavLinks } from "@/components/layout/NavLinks";

export function LeftSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col gap-10 border-r border-border px-4 py-6 lg:flex">
      <div className="px-3">
        <Logo />
      </div>
      <nav aria-label="Principal" className="flex-1">
        <NavLinks />
      </nav>
      <AuthButton />
      <div className="-mt-6 px-3">
        <LegalLinks />
      </div>
    </aside>
  );
}
