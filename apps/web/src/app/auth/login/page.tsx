import { AuthCard } from "@/components/auth/auth-card";
import { de } from "@/messages/de";

export default function LoginPage() {
  return <AuthCard title={de.auth.loginTitle} mode="login" />;
}
