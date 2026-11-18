import { normalizeShortCode } from "@spoolworks/core";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { findSpoolIdByCode } from "@/lib/queries/spools";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

/**
 * Target of printed labels and NFC tags: /s/K7M2Q9XA. Opens the spool of the
 * signed-in workshop; signed out it goes through the login and comes back.
 * Invalid, unknown and foreign codes are all a plain 404.
 */
export default function SpoolCodePage({ params }: PageProps<"/s/[code]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <ResolveCode params={params} />
    </Suspense>
  );
}

async function ResolveCode({ params }: { params: PageProps<"/s/[code]">["params"] }): Promise<null> {
  const { code: raw } = await params;
  const code = normalizeShortCode(decodeURIComponent(raw));
  if (!code) notFound();
  const { workshop } = await requireWorkshop(`/s/${code}`);
  const spoolId = await findSpoolIdByCode(workshop.id, code);
  if (!spoolId) notFound();
  redirect(`/spools/${spoolId}`);
}
