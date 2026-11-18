"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { updateGallery } from "@/app/settings/actions";
import { Field, inputClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/lib/use-form-action";
import { de } from "@/messages/de";

const t = de.settings;

export function GalleryForm({ handle, isPublic }: { handle: string | null; isPublic: boolean }) {
  const { state, pending, onSubmit } = useFormAction(updateGallery);
  const [value, setValue] = useState(handle ?? "");
  const [checked, setChecked] = useState(isPublic);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label={t.handleLabel}
        htmlFor="publicHandle"
        hint={t.handleHint}
        error={state.fieldErrors?.["publicHandle"]}
      >
        <div className="flex items-center gap-2">
          <span className="figure shrink-0 text-sm text-muted-foreground">/u/</span>
          <Input
            id="publicHandle"
            name="publicHandle"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={30}
            className={`${inputClass} figure`}
          />
        </div>
      </Field>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="galleryPublic"
          value="1"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span>
          <span className="block">{t.galleryPublicLabel}</span>
          <span className="block text-xs text-muted-foreground">{t.galleryPublicHint}</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-11 px-5" disabled={pending}>
          {t.save}
        </Button>
        {isPublic && handle && (
          <Button asChild variant="outline" className="h-11">
            <a href={`/u/${handle}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" />
              {t.galleryOpen}
            </a>
          </Button>
        )}
        {state.ok && (
          <p className="text-sm text-success" role="status">
            {t.saved}
          </p>
        )}
      </div>
    </form>
  );
}
