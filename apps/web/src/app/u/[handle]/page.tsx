import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PublicFrame } from "@/components/public/public-frame";
import { PublicPrintCard } from "@/components/public/public-print";
import { Tile } from "@/components/tile";
import { getPublicGallery } from "@/lib/queries/public";
import { de } from "@/messages/de";

const pub = de.publicPage;

/** Kept out of search engines for now; the owner shares the address themselves. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Public gallery: exactly the prints the owner shared. Unknown handle and a
 * gallery that is switched off are both a plain 404. Uncached, so switching
 * it off takes effect on the next request.
 */
export default function PublicGalleryPage({ params }: PageProps<"/u/[handle]">) {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-muted-foreground">{de.common.loading}</p>}>
      <PublicGallery params={params} />
    </Suspense>
  );
}

async function PublicGallery({ params }: { params: PageProps<"/u/[handle]">["params"] }) {
  const { handle } = await params;
  const gallery = await getPublicGallery(decodeURIComponent(handle));
  if (!gallery) notFound();
  return (
    <PublicFrame>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{pub.galleryTitle(gallery.handle)}</h1>
          <p className="figure mt-1 text-sm text-muted-foreground">{pub.galleryCount(gallery.prints.length)}</p>
        </div>
        {gallery.prints.length === 0 ? (
          <Tile className="py-10 text-center text-sm text-muted-foreground">{pub.galleryEmpty}</Tile>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {gallery.prints.map((print) => (
              <li key={print.token}>
                <PublicPrintCard print={print} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicFrame>
  );
}
