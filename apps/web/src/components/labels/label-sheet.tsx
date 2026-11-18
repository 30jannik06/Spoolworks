import { formatShortCode, layoutLabelSheets, type LabelPreset } from "@spoolworks/core";

import { QrCode } from "@/components/labels/qr-code";
import { spoolLabelUrl } from "@/lib/label-origin";
import type { LabelSpool } from "@/lib/queries/spools";
import { de } from "@/messages/de";

const mm = (um: number) => `${um / 1000}mm`;

/**
 * A4 sheets with one label per spool, positioned in millimetres. Colours are
 * hard-coded black on white on purpose: this is paper, not themed UI.
 */
export function LabelSheets({
  spools,
  preset,
  skip,
  cut,
  origin,
}: {
  spools: LabelSpool[];
  preset: LabelPreset;
  skip: number;
  cut: boolean;
  origin: string;
}) {
  const sheets = layoutLabelSheets(preset, spools.length, skip);
  const heightMm = preset.heightUm / 1000;
  // Text scales with the label height: 10 pt on a 37 mm label.
  const fontPt = Math.round(heightMm * 0.27 * 10) / 10;
  // 24 mm is plenty for a phone camera and leaves the text room on wide labels.
  const qrMm = `${Math.min(heightMm - 5, 24)}mm`;

  return (
    <div className="space-y-4 print:space-y-0">
      {sheets.map((labels, sheetIndex) => (
        <section
          key={sheetIndex}
          className="label-sheet mx-auto rounded-sm border shadow-sm print:rounded-none print:shadow-none"
          aria-label={de.labels.sheetAria(sheetIndex + 1)}
        >
          {labels.map((placed) => {
            const spool = spools[placed.index]!;
            return (
              <div
                key={spool.id}
                className="absolute flex items-center overflow-hidden"
                style={{
                  left: mm(placed.xUm),
                  top: mm(placed.yUm),
                  width: mm(preset.widthUm),
                  height: mm(preset.heightUm),
                  padding: "2.5mm",
                  gap: "2.5mm",
                  fontSize: `${fontPt}pt`,
                  lineHeight: 1.2,
                  outline: cut ? "0.2mm dashed #9a9a9a" : undefined,
                  outlineOffset: cut ? "-0.1mm" : undefined,
                  breakInside: "avoid",
                }}
              >
                <QrCode
                  value={spoolLabelUrl(origin, spool.shortCode)}
                  label={de.labels.qr(formatShortCode(spool.shortCode))}
                  className="shrink-0"
                  style={{ width: qrMm, height: qrMm }}
                />
                <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ gap: "0.25em" }}>
                  <span className="font-mono font-semibold" style={{ fontSize: "1.15em", letterSpacing: "0.04em" }}>
                    {formatShortCode(spool.shortCode)}
                  </span>
                  <span className="line-clamp-2 font-medium">
                    {spool.productLine} {spool.colorName}
                  </span>
                  <span className="truncate" style={{ fontSize: "0.8em", color: "#444" }}>
                    {spool.brand} · {de.materials[spool.material]} · {spool.diameterUm === 2850 ? "2,85" : "1,75"} mm
                  </span>
                  <span className="flex items-center" style={{ gap: "0.4em", fontSize: "0.8em", color: "#444" }}>
                    <span
                      className="inline-block shrink-0 rounded-full"
                      style={{
                        width: "0.9em",
                        height: "0.9em",
                        backgroundColor: spool.colorHex,
                        border: "0.15mm solid #666",
                        printColorAdjust: "exact",
                        WebkitPrintColorAdjust: "exact",
                      }}
                    />
                    {spool.netWeightG.toLocaleString("de-DE")} g
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
