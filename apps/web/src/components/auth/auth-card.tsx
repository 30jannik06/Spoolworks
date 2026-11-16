import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { de } from "@/messages/de";

export function AuthCard({ title, mode }: { title: string; mode: "login" | "register" }) {
  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* useSearchParams() reads the request, so it needs a boundary. */}
        <Suspense fallback={<p className="text-sm text-muted-foreground">{de.common.loading}</p>}>
          <AuthForm mode={mode} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
