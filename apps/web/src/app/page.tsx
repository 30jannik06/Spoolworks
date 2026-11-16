import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession, getWorkshopForUser } from "@/lib/session";
import { de } from "@/messages/de";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">{de.common.loading}</p>}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const session = await getSession();
  if (!session) {
    return <Landing />;
  }
  const workshop = await getWorkshopForUser(session.user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{de.home.welcome(session.user.name)}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{de.home.workshop}</CardTitle>
          <CardDescription>{workshop.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{de.home.lowStockThreshold(workshop.lowStockThresholdG)}</p>
          <p className="text-muted-foreground">{de.home.comingSoon}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Landing() {
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{de.home.landingTitle}</h1>
      <p className="text-lg text-muted-foreground">{de.home.landingBody}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="h-11 text-base">
          <Link href="/auth/register">{de.nav.signUp}</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 text-base">
          <Link href="/auth/login">{de.nav.signIn}</Link>
        </Button>
      </div>
    </div>
  );
}
