import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";

import { ProfileView } from "@/components/profile/ProfileView";
import { api } from "@/convex/_generated/api";

export async function generateMetadata({
  params,
}: PageProps<"/profile/[profileId]">): Promise<Metadata> {
  const { profileId } = await params;
  const profile = await fetchQuery(api.users.getById, { profileId });
  if (!profile) return { title: "Perfil no encontrado" };
  return {
    title: profile.name,
    description: `Podcasts de ${profile.name} en Waves.`,
  };
}

export default async function ProfilePage({
  params,
}: PageProps<"/profile/[profileId]">) {
  const { profileId } = await params;
  return <ProfileView profileId={profileId} />;
}
