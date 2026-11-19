import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { de } from "@/messages/de";

export const metadata: Metadata = { title: de.nav.signIn };

export default function LoginPage() {
  return <AuthCard title={de.auth.loginTitle} subtitle={de.auth.loginSubtitle} mode="login" />;
}
