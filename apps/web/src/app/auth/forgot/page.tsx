import { Mail } from "lucide-react";
import Link from "next/link";

import { Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { supportEmail } from "@/lib/admin";
import { de } from "@/messages/de";

const a = de.auth;

/** No mail service: the page points to the support address (SUPPORT_EMAIL). */
export default function ForgotPage() {
  const address = supportEmail();
  return (
    <div className="mx-auto w-full max-w-sm space-y-5 px-4 py-12 md:py-20">
      <h1 className="text-2xl font-medium tracking-tight">{a.forgotTitle}</h1>
      <Tile className="space-y-4 p-5">
        <p className="text-sm">{a.forgotBody}</p>
        {address ? (
          <Button asChild className="h-11 w-full text-base">
            <a href={`mailto:${address}?subject=${encodeURIComponent(a.forgotSubject)}`}>
              <Mail aria-hidden="true" />
              {a.forgotMail(address)}
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{a.forgotNoSupport}</p>
        )}
      </Tile>
      <Link
        href="/auth/login"
        className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {a.backToLogin}
      </Link>
    </div>
  );
}
