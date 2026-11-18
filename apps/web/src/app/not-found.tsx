import type { Metadata } from "next";
import Link from "next/link";

import { ErrorScreen } from "@/components/errors/error-screen";
import { Button } from "@/components/ui/button";
import { de } from "@/messages/de";

const e = de.errorPage;

export const metadata: Metadata = { title: e.notFoundTitle };

/** Unknown address and "not yours" look the same, so the copy never says which. */
export default function NotFound() {
  return (
    <ErrorScreen code="404" title={e.notFoundTitle} body={e.notFoundBody}>
      <Button asChild className="h-11">
        <Link href="/">{e.home}</Link>
      </Button>
    </ErrorScreen>
  );
}
