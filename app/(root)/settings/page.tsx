import type { Metadata } from "next";

import { BlockedAccounts } from "@/components/settings/BlockedAccounts";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { SectionHeader } from "@/components/shared/SectionHeader";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SectionHeader as="h1" title="Ajustes" />
      <ProfileForm />
      <BlockedAccounts />
    </div>
  );
}
