"use client";

import { PRINT_PHOTO_LIMIT } from "@spoolworks/core";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { deletePrintPhoto, setPrintCover, uploadPrintPhoto } from "@/app/prints/photo-actions";
import { Eyebrow, Tile } from "@/components/tile";
import { Button } from "@/components/ui/button";
import { errorText } from "@/lib/error-text";
import { preparePhoto } from "@/lib/photo-resize";
import { cn } from "@/lib/utils";
import { de } from "@/messages/de";

const t = de.photos;

type Photo = { id: string; width: number; height: number };

/**
 * Photos of one print: the first is the cover. Uploading opens the camera or
 * the gallery on a phone (no `capture`, so both are offered). Plain <img>:
 * the image optimizer's cache would sit in front of the permission check.
 */
export function PhotoPanel({ printId, photos }: { printId: string; photos: Photo[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const full = photos.length >= PRINT_PHOTO_LIMIT;

  function upload(file: File) {
    setError(undefined);
    startTransition(async () => {
      const prepared = await preparePhoto(file);
      if (!prepared) {
        setError("photo_unreadable");
        return;
      }
      const data = new FormData();
      data.set("photo", new File([prepared.photo], "photo.jpg", { type: "image/jpeg" }));
      data.set("thumb", new File([prepared.thumb], "thumb.jpg", { type: "image/jpeg" }));
      data.set("width", String(prepared.width));
      data.set("height", String(prepared.height));
      const result = await uploadPrintPhoto(printId, data);
      if (!result.ok) setError(result.error);
    });
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      setConfirming(null);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Tile className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{t.title}</Eyebrow>
        <span className="figure text-xs text-muted-foreground">
          {photos.length} / {PRINT_PHOTO_LIMIT}
        </span>
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id} className={cn("space-y-1", index === 0 && "col-span-2")}>
              <a href={`/photos/${photo.id}`} target="_blank" rel="noopener" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- private photo, served after a permission check */}
                <img
                  src={index === 0 ? `/photos/${photo.id}` : `/photos/${photo.id}?size=thumb`}
                  alt={index === 0 ? t.coverAlt : t.photoAlt(index + 1)}
                  width={photo.width}
                  height={photo.height}
                  className="aspect-[4/3] w-full rounded-lg border bg-muted object-cover"
                />
              </a>
              <div className="flex items-center gap-1">
                {index === 0 ? (
                  <span className="inline-flex h-11 items-center gap-1.5 px-1 text-xs text-muted-foreground">
                    <Star className="size-3.5 fill-primary text-primary" aria-hidden="true" />
                    {t.cover}
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 px-2 text-xs"
                    disabled={pending}
                    onClick={() => run(() => setPrintCover(photo.id))}
                  >
                    <Star aria-hidden="true" />
                    {t.makeCover}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="ml-auto size-11 text-muted-foreground hover:text-destructive"
                  aria-label={t.delete}
                  disabled={pending}
                  onClick={() => setConfirming(photo.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              {confirming === photo.id && (
                <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3" role="alertdialog">
                  <p className="text-sm">{t.deleteConfirm}</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="h-11" onClick={() => setConfirming(null)}>
                      {de.prints.cancel}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-11"
                      disabled={pending}
                      onClick={() => run(() => deletePrintPhoto(photo.id))}
                    >
                      {t.deleteYes}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="text-xs text-muted-foreground">{t.full}</p>
      ) : (
        <>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) upload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className={cn("w-full", photos.length === 0 ? "h-24 border-dashed" : "h-11")}
            disabled={pending}
            onClick={() => input.current?.click()}
          >
            <ImagePlus aria-hidden="true" />
            {pending ? t.uploading : photos.length === 0 ? t.addFirst : t.add}
          </Button>
          {photos.length === 0 && <p className="text-xs text-muted-foreground">{t.hint}</p>}
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
