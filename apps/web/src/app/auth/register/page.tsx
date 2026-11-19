import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { de } from "@/messages/de";

export const metadata: Metadata = { title: de.auth.registerTitle };

export default function RegisterPage() {
  return (
    <AuthCard title={de.auth.registerTitle} subtitle={de.auth.registerSubtitle} mode="register" />
  );
}
