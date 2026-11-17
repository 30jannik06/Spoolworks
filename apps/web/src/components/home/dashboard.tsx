import { Sparkles } from "lucide-react";

import { SpoolRing } from "@/components/spool-ring";
import { Eyebrow, Figure, Tile } from "@/components/tile";
import { de } from "@/messages/de";

/**
 * The signed-in home. Phase 1 fills it with real figures; until then every
 * tile shows its honest empty state. One column on phones, a 3-column grid
 * from `md` up.
 */
export function Dashboard({
  userName,
  workshopName,
  lowStockThresholdG,
}: {
  userName: string;
  workshopName: string;
  lowStockThresholdG: number;
}) {
  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <Eyebrow>{workshopName}</Eyebrow>
        <h1 className="mt-1 text-2xl font-medium tracking-tight md:text-3xl">{de.home.greeting(userName)}</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-3 md:gap-4">
        <Tile className="md:col-span-2 md:p-6">
          <Eyebrow>{de.home.stockEyebrow}</Eyebrow>
          <Figure value="0" unit={de.home.stockUnit} className="mt-3 md:[&>span:first-child]:text-5xl" />
          <p className="mt-3 text-sm text-muted-foreground">{de.home.stockEmpty}</p>
        </Tile>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-4">
          <Tile className="md:p-6">
            <Eyebrow>{de.home.lowStockEyebrow}</Eyebrow>
            <p className="figure mt-2 text-xl md:text-2xl">{de.home.lowStockValue(lowStockThresholdG)}</p>
          </Tile>
          <Tile className="md:p-6">
            <Eyebrow>{de.home.printsEyebrow}</Eyebrow>
            <p className="figure mt-2 text-xl md:text-2xl">{de.home.printsEmpty}</p>
          </Tile>
        </div>

        <Tile className="md:col-span-2 md:p-6">
          <Eyebrow>{de.home.amsEyebrow}</Eyebrow>
          <div className="mt-4 grid grid-cols-4 gap-2 md:max-w-md">
            {[1, 2, 3, 4].map((slot) => (
              <div key={slot} className="flex flex-col items-center gap-1.5">
                <SpoolRing fraction={0} size={52} thickness={6} />
                <span className="figure text-[11px] text-muted-foreground">0{slot}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{de.home.amsEmpty}</p>
        </Tile>

        <Tile className="flex gap-3 md:p-6">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">{de.home.nextTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{de.home.nextBody}</p>
          </div>
        </Tile>
      </div>
    </div>
  );
}
