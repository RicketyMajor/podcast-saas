import { ProfileView } from "@/components/profile/ProfileView";

export default async function ProfilePage({
  params,
}: PageProps<"/profile/[profileId]">) {
  const { profileId } = await params;
  return <ProfileView profileId={profileId} />;
}
