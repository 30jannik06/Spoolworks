import Link from "next/link";
import { Suspense } from "react";

import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { GalleryForm } from "@/components/settings/gallery-form";
import { PasswordForm } from "@/components/settings/password-form";
import { ThresholdForm } from "@/components/settings/threshold-form";
import { Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/admin";
import { requireWorkshop } from "@/lib/session";
import { de } from "@/messages/de";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const { user, workshop } = await requireWorkshop("/settings");
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{de.settings.title}</h1>
      <Tile className="space-y-4 md:p-6">
        <div>
          <h2 className="font-medium">{de.settings.thresholdTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{de.settings.thresholdBody}</p>
        </div>
        <ThresholdForm current={workshop.lowStockThresholdG} />
      </Tile>
      <Tile className="space-y-4 md:p-6">
        <div>
          <h2 className="font-medium">{de.settings.galleryTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{de.settings.galleryBody}</p>
        </div>
        <GalleryForm handle={workshop.publicHandle} isPublic={workshop.galleryPublic} />
      </Tile>
      <Tile className="space-y-4 md:p-6">
        <div>
          <h2 className="font-medium">{de.settings.passwordTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{de.settings.passwordBody}</p>
        </div>
        <PasswordForm />
      </Tile>
      {isAdmin(user.email) && (
        <Tile className="space-y-3 md:p-6">
          <div>
            <h2 className="font-medium">{de.settings.adminTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{de.settings.adminBody}</p>
          </div>
          <Button asChild variant="outline" className="h-11">
            <Link href="/admin">{de.settings.adminOpen}</Link>
          </Button>
        </Tile>
      )}
      <Tile className="space-y-4 border-destructive/40 md:p-6">
        <div>
          <h2 className="font-medium text-destructive">{de.settings.deleteTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{de.settings.deleteBody}</p>
        </div>
        <DeleteAccountForm />
      </Tile>
    </div>
  );
}
