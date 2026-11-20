import type { CatalogSyncRunView } from "@/lib/queries/catalog-sync";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

const when = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** The latest catalog sync runs; `overdue` warns that the nightly cron stopped succeeding. */
export function CatalogSyncRuns({ runs, overdue }: { runs: CatalogSyncRunView[]; overdue: boolean }) {
  const t = de.admin;
  return (
    <div className="space-y-3">
      {overdue && (
        <p className="text-sm text-warning" role="alert">
          {t.runsOverdue}
        </p>
      )}
      {runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.runsEmpty}</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {runs.map((run) => (
            <li key={run.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium tabular-nums">{when.format(run.startedAt)}</span>
                <span className="text-muted-foreground">
                  {t.runTrigger[run.trigger]} · {run.seconds} s
                </span>
              </div>
              <p className={cn("mt-0.5", run.ok ? "text-muted-foreground" : "text-destructive")}>
                {run.ok && run.report
                  ? t.runOk(run.report)
                  : run.suspicious
                    ? t.runSuspicious
                    : t.runFailed(run.error)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
