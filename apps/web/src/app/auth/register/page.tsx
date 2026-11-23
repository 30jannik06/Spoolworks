import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { publicPageMetadata } from "@/lib/seo";
import { de } from "@/messages/de";

export const metadata: Metadata = publicPageMetadata({
  title: de.auth.registerTitle,
  description: de.seo.registerDescription,
  path: "/auth/register",
});

export default function RegisterPage() {
  return (
    <AuthCard title={de.auth.registerTitle} subtitle={de.auth.registerSubtitle} mode="register" />
  );
}
