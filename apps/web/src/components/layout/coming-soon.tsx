import { Suspense, type ComponentType, type ReactNode } from "react";

import { Tile } from "@/components/tile";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

/**
 * Placeholder for a tab whose feature arrives in a later phase. Still behind
 * login, so the shell behaves like the real thing.
 */
export function ComingSoon({
  path,
  title,
  body,
  icon: Icon,
}: {
  path: string;
  title: string;
  body: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Gate path={path}>
        <div className="space-y-4">
          <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
          <Tile className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl border bg-background">
              <Icon className="size-6 text-muted-foreground" />
            </span>
            <p className="max-w-xs text-sm text-muted-foreground">{body}</p>
          </Tile>
        </div>
      </Gate>
    </Suspense>
  );
}

async function Gate({ path, children }: { path: string; children: ReactNode }) {
  await requireWorkshop(path);
  return children;
}
