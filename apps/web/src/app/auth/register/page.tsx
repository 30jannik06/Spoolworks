import { AuthCard } from "@/components/auth/auth-card";
import { de } from "@/messages/de";

export default function RegisterPage() {
  return (
    <AuthCard title={de.auth.registerTitle} subtitle={de.auth.registerSubtitle} mode="register" />
  );
}
