"use client";

import { Check, Copy, ExternalLink, Link2, Link2Off } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";

import { setPrintShared } from "@/app/prints/actions";
import { Eyebrow, Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorText } from "@/lib/error-text";
import { de } from "@/messages/de";

const s = de.share;

const subscribeNever = () => () => {};

/**
 * Share switch for one print. The full link uses the origin the page is open
 * on, so it is right on production, previews and localhost alike (each has
 * its own database, a token only exists where it was made).
 */
export function SharePanel({
  printId,
  token,
  galleryHandle,
}: {
  printId: string;
  token: string | null;
  /** The owner's handle if the gallery is public, else null. */
  galleryHandle: string | null;
}) {
  const origin = useSyncExternalStore(subscribeNever, () => window.location.origin, () => "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const path = token ? `/p/${token}` : null;

  function toggle(shared: boolean) {
    setError(undefined);
    setCopied(false);
    startTransition(async () => {
      const result = await setPrintShared(printId, shared);
      if (!result.ok) setError(result.error);
    });
  }

  async function copy() {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
    } catch {
      setError("fallback");
    }
  }

  return (
    <Tile className="space-y-3">
      <Eyebrow>{s.title}</Eyebrow>
      {path ? (
        <>
          <label htmlFor={`share-${printId}`} className="sr-only">
            {s.linkLabel}
          </label>
          <Input
            id={`share-${printId}`}
            readOnly
            value={`${origin}${path}`}
            onFocus={(event) => event.currentTarget.select()}
            className="figure h-11 text-base md:text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={copy}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? s.copied : s.copy}
            </Button>
            <Button asChild variant="outline" className="h-11">
              <a href={path} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                {s.open}
              </a>
            </Button>
            <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => toggle(false)}>
              <Link2Off aria-hidden="true" />
              {pending ? s.pending : s.stop}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {s.sharedBody} {galleryHandle ? s.inGallery(galleryHandle) : s.notInGallery}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{s.privateBody}</p>
          <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => toggle(true)}>
            <Link2 aria-hidden="true" />
            {pending ? s.pending : s.start}
          </Button>
        </>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {errorText(error)}
        </p>
      )}
    </Tile>
  );
}
