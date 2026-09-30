import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Crear cuenta · Waves" };

export default async function SignUpPage({
  searchParams,
}: PageProps<"/sign-up">) {
  const { redirectTo } = await searchParams;
  return <AuthForm mode="signUp" redirectTo={safeRedirectPath(redirectTo)} />;
}
