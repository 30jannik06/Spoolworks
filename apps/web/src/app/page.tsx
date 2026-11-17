import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Eyebrow, Figure, Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-3">
      <div className="pb-2">
        <h1 className="text-2xl font-medium tracking-tight">{de.home.greeting(session.user.name)}</h1>
        <p className="text-sm text-muted-foreground">{workshop.name}</p>
      </div>

      {/* Phase 1 fills these with real figures; until then they show the empty state honestly. */}
      <Tile>
        <Eyebrow>{de.home.stockEyebrow}</Eyebrow>
        <Figure value="0" unit={de.home.stockUnit} className="mt-2" />
        <p className="mt-2 text-sm text-muted-foreground">{de.home.stockEmpty}</p>
      </Tile>

      <div className="grid grid-cols-2 gap-3">
        <Tile>
          <Eyebrow>{de.home.lowStockEyebrow}</Eyebrow>
          <p className="figure mt-2 text-xl">{de.home.lowStockValue(workshop.lowStockThresholdG)}</p>
        </Tile>
        <Tile>
          <Eyebrow>{de.home.printsEyebrow}</Eyebrow>
          <p className="figure mt-2 text-xl">{de.home.printsEmpty}</p>
        </Tile>
      </div>

      <Tile>
        <Eyebrow>{de.home.amsEyebrow}</Eyebrow>
        <div className="mt-3 grid grid-cols-4 gap-2" aria-hidden="true">
          {[1, 2, 3, 4].map((slot) => (
            <div key={slot} className="flex flex-col items-center gap-1.5">
              <svg viewBox="0 0 40 40" className="size-11">
                <circle cx="20" cy="20" r="15" fill="none" stroke="var(--muted)" strokeWidth="5" />
              </svg>
              <span className="figure text-[11px] text-muted-foreground">0{slot}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{de.home.amsEmpty}</p>
      </Tile>

      <Tile className="flex gap-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">{de.home.nextTitle}</p>
          <p className="text-sm text-muted-foreground">{de.home.nextBody}</p>
        </div>
      </Tile>
    </div>
  );
}

function Landing() {
  return (
    <div className="space-y-8 py-6">
      <div className="space-y-4">
        <Eyebrow>{de.home.landingEyebrow}</Eyebrow>
        <h1 className="text-4xl leading-[1.05] font-medium tracking-tight">{de.home.landingTitle}</h1>
        <p className="text-lg text-muted-foreground">{de.home.landingBody}</p>
      </div>

      <ul className="divide-y rounded-xl border bg-card">
        {de.home.landingPoints.map((point) => (
          <li key={point} className="flex items-center gap-3 px-4 py-3 text-sm">
            <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="h-12 text-base">
          <Link href="/auth/register">
            {de.nav.signUp}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12 text-base">
          <Link href="/auth/login">{de.nav.signIn}</Link>
        </Button>
      </div>
    </div>
  );
}
