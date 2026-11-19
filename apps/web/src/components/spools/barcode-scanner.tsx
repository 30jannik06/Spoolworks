"use client";

import { barcodeCandidates } from "@spoolworks/core";
import type { DecodeHintType as DecodeHint } from "@zxing/library";
import { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { de } from "@/messages/de";

const f = de.spoolForm;

type ScanError = "denied" | "missing" | "unsupported" | "failed";

function scanErrorFrom(error: unknown): ScanError {
  const name = error instanceof Error || error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  return "failed";
}

const errorCopy: Record<ScanError, string> = {
  denied: f.scanDenied,
  missing: f.scanNoCamera,
  unsupported: f.scanUnsupported,
  failed: f.scanFailed,
};

/**
 * Camera barcode scanner in a dialog. Frames are decoded in the browser
 * (@zxing/browser, loaded only when the dialog opens); only the detected
 * number leaves this component. The camera stops on detection, on close and
 * on unmount.
 */
export function BarcodeScanner({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<ScanError | null>(null);
  // The latest callback without restarting the camera when the parent re-renders.
  const detectedRef = useRef(onDetected);
  useEffect(() => {
    detectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stop: (() => void) | null = null;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("unsupported");
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (cancelled || !videoRef.current) return;
        const formats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
        const reader = new BrowserMultiFormatReader(new Map<DecodeHint, unknown>([[DecodeHintType.POSSIBLE_FORMATS, formats]]));
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current,
          (result, _error, scanControls) => {
            if (!result) return;
            const text = result.getText();
            if (barcodeCandidates(text).length === 0) return;
            scanControls.stop();
            navigator.vibrate?.(60);
            detectedRef.current(text);
          },
        );
        // Closed while the camera was starting: stop it right away.
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      } catch (caught) {
        if (!cancelled) setError(scanErrorFrom(caught));
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A fresh try next time, e.g. after allowing the camera in the browser settings.
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{f.scanTitle}</DialogTitle>
          <DialogDescription>{f.scanHint}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="rounded-lg border p-4 text-sm" role="alert">
            {errorCopy[error]}
          </p>
        ) : (
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
            <video ref={videoRef} className="size-full object-cover" playsInline muted autoPlay />
            {/* Aiming guide: a wide box where the barcode should sit. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[30%] -translate-y-1/2 rounded-md border-2 border-primary"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
