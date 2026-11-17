"use client";

import { netFromGross } from "@spoolworks/core";
import { CheckCircle2 } from "lucide-react";
import { useActionState, useState } from "react";

import { correctSpool, weighSpool } from "@/app/spools/actions";
import { Select } from "@/components/form/field";
import { Keypad } from "@/components/keypad";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { errorText } from "@/lib/error-text";
import { de } from "@/messages/de";

export type WeighableSpool = {
  id: string;
  label: string;
  colorHex: string;
  emptySpoolWeightG: number;
};

type Mode = "weigh" | "correct";

/** Dispatches to the weighing or the correction action, depending on the mode. */
async function submit(prev: ActionState, formData: FormData): Promise<ActionState> {
  return formData.get("mode") === "correct" ? correctSpool(prev, formData) : weighSpool(prev, formData);
}

/**
 * Enter a weight on a thumb-sized keypad. "Wiegen" takes the gross weight from
 * the scale and subtracts the empty spool; "Korrektur" sets the net weight
 * directly. With several spools a picker comes first (quick action), with one
 * spool it is fixed (spool page).
 */
export function WeighPanel({ spools, initialSpoolId }: { spools: WeighableSpool[]; initialSpoolId?: string }) {
  const [state, formAction, pending] = useActionState(submit, initialActionState);
  const [mode, setMode] = useState<Mode>("weigh");
  const [value, setValue] = useState("");
  const [spoolId, setSpoolId] = useState(initialSpoolId ?? spools[0]?.id ?? "");
  const spool = spools.find((candidate) => candidate.id === spoolId);

  if (!spool) {
    return <p className="text-sm text-muted-foreground">{de.weigh.pickSpoolEmpty}</p>;
  }

  const grams = value === "" ? null : Number.parseInt(value, 10);
  const net = grams === null ? null : mode === "weigh" ? netFromGross(grams, spool.emptySpoolWeightG) : grams;
  const error = state.fieldErrors?.["grossG"] ?? state.fieldErrors?.["netG"] ?? state.error;

  return (
    <form
      action={(formData) => {
        formAction(formData);
        setValue("");
      }}
      className="space-y-4"
    >
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="spoolId" value={spool.id} />
      <input type="hidden" name={mode === "weigh" ? "grossG" : "netG"} value={value} />

      {spools.length > 1 && (
        <div className="space-y-1.5">
          <label htmlFor="weigh-spool" className="eyebrow">
            {de.weigh.pickSpool}
          </label>
          <div className="flex items-center gap-2">
            <span className="size-5 shrink-0 rounded-full border" style={{ backgroundColor: spool.colorHex }} />
            <Select id="weigh-spool" value={spoolId} onChange={(event) => setSpoolId(event.target.value)}>
              {spools.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      <Segmented
        label={de.weigh.title}
        value={mode}
        onChange={(next) => {
          setMode(next);
          setValue("");
        }}
        options={[
          { value: "weigh", label: de.weigh.modeWeigh },
          { value: "correct", label: de.weigh.modeCorrect },
        ]}
      />

      <div className="py-2 text-center" aria-live="polite">
        <p className="flex items-baseline justify-center gap-1.5">
          <span className={`figure text-5xl leading-none ${value === "" ? "text-muted-foreground" : ""}`}>
            {value === "" ? "0" : Number.parseInt(value, 10).toLocaleString("de-DE")}
          </span>
          <span className="text-lg text-muted-foreground">{de.weigh.unit}</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {mode === "weigh" && net !== null
            ? de.weigh.preview(net)
            : mode === "weigh"
              ? de.weigh.grossHint(spool.emptySpoolWeightG)
              : de.weigh.netHint}
        </p>
      </div>

      <Keypad value={value} onChange={setValue} />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {errorText(error)}
        </p>
      )}
      {state.ok && state.value !== undefined && value === "" && (
        <p className="flex items-center gap-2 text-sm text-success" role="status">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {de.weigh.saved(state.value)}
        </p>
      )}

      <Button type="submit" className="h-12 w-full text-base" disabled={pending || value === ""}>
        {de.weigh.save}
      </Button>
    </form>
  );
}
