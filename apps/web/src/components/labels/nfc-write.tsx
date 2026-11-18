"use client";

import { Check, Copy, Nfc } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { de } from "@/messages/de";

const l = de.labels;

/** Web NFC (Chrome on Android only). TypeScript's DOM lib has no types for it. */
type NdefReader = {
  write(message: { records: { recordType: "url"; data: string }[] }): Promise<void>;
};
type NdefWindow = Window & { NDEFReader?: new () => NdefReader };

type Status = "idle" | "waiting" | "done" | "denied" | "failed" | "copied";

const subscribeNever = () => () => {};
const hasWebNfc = () => typeof (window as NdefWindow).NDEFReader === "function";

/**
 * Writes the spool's label URL onto an NFC tag. Where Web NFC is missing
 * (iPhone, desktop, other browsers) it offers to copy the link instead, for
 * any NFC app. The server snapshot says "unsupported", so server and client
 * render the same first frame.
 */
export function NfcWrite({ url, children }: { url: string; children?: ReactNode }) {
  const supported = useSyncExternalStore(subscribeNever, hasWebNfc, () => false);
  const [status, setStatus] = useState<Status>("idle");

  async function write() {
    const Reader = (window as NdefWindow).NDEFReader;
    if (!Reader) return;
    setStatus("waiting");
    try {
      await new Reader().write({ records: [{ recordType: "url", data: url }] });
      setStatus("done");
    } catch (error) {
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "failed");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  const message =
    status === "waiting"
      ? l.nfcWaiting
      : status === "done"
        ? l.nfcDone
        : status === "denied"
          ? l.nfcDenied
          : status === "failed" && supported
            ? l.nfcFailed
            : supported
              ? null
              : l.nfcUnsupported;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {children}
        {supported && (
          <Button type="button" variant="outline" className="h-11" onClick={write} disabled={status === "waiting"}>
            <Nfc aria-hidden="true" />
            {l.nfcWrite}
          </Button>
        )}
        <Button type="button" variant="outline" className="h-11" onClick={copy}>
          {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {status === "copied" ? l.copied : l.copyLink}
        </Button>
      </div>
      {message && (
        <p
          className={
            status === "denied" || status === "failed" ? "text-xs text-destructive" : "text-xs text-muted-foreground"
          }
          role={status === "denied" || status === "failed" ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </div>
  );
}
