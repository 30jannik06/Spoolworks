import { CodeEntry } from "@/components/labels/code-entry";
import { BackLink } from "@/components/layout/back-link";
import { Tile } from "@/components/tile";
import { de } from "@/messages/de";

/** Open a spool by typing the code from its label. The action checks the session itself. */
export default function CodeEntryPage() {
  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <BackLink href="/" label={de.nav.home} />
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">{de.labels.codeTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{de.labels.codeBody}</p>
      </div>
      <Tile className="md:p-5">
        <CodeEntry />
      </Tile>
    </div>
  );
}
