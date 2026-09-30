import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Iniciar sesión · Waves" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { redirectTo } = await searchParams;
  return <AuthForm mode="signIn" redirectTo={safeRedirectPath(redirectTo)} />;
}
