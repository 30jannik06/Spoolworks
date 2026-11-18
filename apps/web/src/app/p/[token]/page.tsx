import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PublicFrame } from "@/components/public/public-frame";
import { PublicPrintView } from "@/components/public/public-print";
import { getSharedPrint } from "@/lib/queries/public";
import { de } from "@/messages/de";

/** Secret links stay out of search engines. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * A shared print, open to anyone with the link. Read uncached on every
 * request, so "stop sharing" kills the link at once. Unknown, malformed and
 * revoked tokens are all a plain 404.
 */
export default function SharedPrintPage({ params }: PageProps<"/p/[token]">) {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-muted-foreground">{de.common.loading}</p>}>
      <SharedPrint params={params} />
    </Suspense>
  );
}

async function SharedPrint({ params }: { params: PageProps<"/p/[token]">["params"] }) {
  const { token } = await params;
  const shared = await getSharedPrint(token);
  if (!shared) notFound();
  return (
    <PublicFrame>
      <PublicPrintView print={shared.print} galleryHandle={shared.galleryHandle} />
    </PublicFrame>
  );
}
