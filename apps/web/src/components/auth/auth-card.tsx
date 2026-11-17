import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { Tile } from "@/components/tile";
import { de } from "@/messages/de";

export function AuthCard({
  title,
  subtitle,
  mode,
}: {
  title: string;
  subtitle: string;
  mode: "login" | "register";
}) {
  return (
    <div className="mx-auto w-full max-w-sm space-y-5 px-4 py-12 md:py-20">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Tile className="p-5">
        {/* useSearchParams() reads the request, so it needs a boundary. */}
        <Suspense fallback={<p className="text-sm text-muted-foreground">{de.common.loading}</p>}>
          <AuthForm mode={mode} />
        </Suspense>
      </Tile>
    </div>
  );
}
