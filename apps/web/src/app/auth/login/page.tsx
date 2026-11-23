import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { publicPageMetadata } from "@/lib/seo";
import { de } from "@/messages/de";

export const metadata: Metadata = publicPageMetadata({
  title: de.nav.signIn,
  description: de.seo.loginDescription,
  path: "/auth/login",
});

export default function LoginPage() {
  return <AuthCard title={de.auth.loginTitle} subtitle={de.auth.loginSubtitle} mode="login" />;
}
