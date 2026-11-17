import { ArrowRight, Images, Layers, Lock, Nfc, Printer, Scale, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { SpoolMark } from "@/components/layout/spool-mark";
import { SpoolRing } from "@/components/spool-ring";
import { Eyebrow, Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { de } from "@/messages/de";

const t = de.landing;
const FEATURE_ICONS = [Scale, Printer, Nfc, Images] as const;

/** Public landing page for guests. Full-width sections, content capped at 6xl. */
export function Landing() {
  return (
    <div>
      <Hero />
      <Features />
      <Steps />
      <Cta />
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-8 text-sm text-muted-foreground md:px-8">
          <SpoolMark className="size-5" />
          {t.footer}
        </div>
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:grid-cols-[1.05fr_1fr] md:gap-16 md:px-8 md:py-24">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-4 text-[2.6rem] leading-[1.02] font-medium tracking-[-0.035em] text-balance md:text-[3.5rem]">
            {t.title}
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">{t.body}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 px-6 text-base">
              <Link href="/auth/register">
                {t.primaryCta}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-6 text-base">
              <Link href="/auth/login">{t.secondaryCta}</Link>
            </Button>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4" aria-hidden="true" />
            {t.privacyNote}
          </p>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}

/** Illustration of the dashboard with sample data, clearly marked as an example. */
function ProductPreview() {
  const p = t.preview;
  const slots = [
    { color: "#EDEBE4", fraction: 0.81, grams: 812 },
    { color: "#3B3B38", fraction: 0.54, grams: 540 },
    { color: "#D2382F", fraction: 0.9, grams: 905 },
    { color: "#4A7BC2", fraction: 0.12, grams: 120, low: true },
  ];

  return (
    <div className="relative" aria-hidden="true">
      <div className="rounded-xl border bg-background p-3 md:p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-muted" />
            <span className="size-2.5 rounded-full bg-muted" />
            <span className="size-2.5 rounded-full bg-muted" />
          </div>
          <span className="rounded-md border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {p.badge}
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-5">
          <Tile className="sm:col-span-3">
            <Eyebrow>{p.stock}</Eyebrow>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="figure text-4xl font-medium">{p.stockValue}</span>
              <span className="text-sm text-muted-foreground">{p.stockUnit}</span>
            </p>
            <svg viewBox="0 0 200 44" className="mt-2 h-11 w-full" preserveAspectRatio="none">
              <polyline
                points="0,8 25,9 50,12 75,11 100,18 125,21 150,24 175,30 200,33"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <p className="mt-1 text-xs text-muted-foreground">{p.stockDelta}</p>
          </Tile>

          <Tile className="sm:col-span-2">
            <Eyebrow>{p.lastPrint}</Eyebrow>
            <div className="mt-3 aspect-[4/3] rounded-lg border bg-muted" />
            <p className="mt-2 text-sm font-medium">{p.lastPrintName}</p>
            <p className="figure text-xs text-muted-foreground">{p.lastPrintMeta}</p>
          </Tile>

          <Tile className="sm:col-span-5">
            <div className="flex items-center justify-between">
              <Eyebrow>{p.ams}</Eyebrow>
              <Layers className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {slots.map((slot, index) => (
                <div key={slot.color} className="flex flex-col items-center gap-1.5">
                  <SpoolRing fraction={slot.fraction} color={slot.color} size={56} thickness={6} />
                  <span className={`figure text-xs ${slot.low ? "text-warning" : ""}`}>
                    {slot.grams} g
                  </span>
                  <span className="figure text-[10px] text-muted-foreground">0{index + 1}</span>
                </div>
              ))}
            </div>
          </Tile>

          <div className="flex items-center gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-warning sm:col-span-5">
            <TriangleAlert className="size-4 shrink-0" />
            {p.lowStock}
          </div>
        </div>
      </div>
    </div>
  );
}

function Features() {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <Eyebrow>{t.featuresEyebrow}</Eyebrow>
        <h2 className="mt-3 max-w-xl text-3xl leading-tight font-medium tracking-tight md:text-4xl">
          {t.featuresTitle}
        </h2>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {t.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index] ?? Scale;
            return (
              <Tile key={feature.title} className="flex flex-col gap-4 p-5">
                <span className="flex size-10 items-center justify-center rounded-lg border bg-background">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-medium tracking-tight">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
                </div>
              </Tile>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <Eyebrow>{t.stepsEyebrow}</Eyebrow>
        <ol className="mt-8 grid border-t md:grid-cols-3 md:border-t-0 md:border-l">
          {t.steps.map((step, index) => (
            <li key={step.title} className="border-b py-6 md:border-r md:border-b-0 md:px-6 md:py-2">
              <span className="figure text-sm text-primary">0{index + 1}</span>
              <h3 className="mt-2 text-lg font-medium tracking-tight">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <Tile className="flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">{t.ctaTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.ctaBody}</p>
          </div>
          <Button asChild className="h-12 px-6 text-base">
            <Link href="/auth/register">
              {t.primaryCta}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </Tile>
      </div>
    </section>
  );
}
