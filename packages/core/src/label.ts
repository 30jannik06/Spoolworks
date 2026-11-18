import { SHORT_CODE_LENGTH } from "./short-code";

/**
 * Spool labels: how a code is printed and where labels sit on an A4 sheet.
 * Lengths are integers in micrometres (`…Um`), like diameters elsewhere.
 */

/** "K7M2Q9XA" → "K7M2-Q9XA". Easier to read aloud and to type; normalizeShortCode drops the hyphen again. */
export function formatShortCode(code: string): string {
  if (code.length !== SHORT_CODE_LENGTH) return code;
  const half = SHORT_CODE_LENGTH / 2;
  return `${code.slice(0, half)}-${code.slice(half)}`;
}

/** Path a label or NFC tag points to. The page resolves it to the spool of the signed-in workshop. */
export function spoolLabelPath(code: string): string {
  return `/s/${code}`;
}

export const A4_WIDTH_UM = 210_000;
export const A4_HEIGHT_UM = 297_000;

export type LabelPreset = {
  id: string;
  widthUm: number;
  heightUm: number;
  columns: number;
  rows: number;
  /** Distance from the sheet's left/top edge to the first label. */
  marginLeftUm: number;
  marginTopUm: number;
  /** Space between neighbouring labels. */
  gapXUm: number;
  gapYUm: number;
};

/** Common A4 label sheets. The first one also works on plain paper with cut lines. */
export const LABEL_PRESETS = [
  // 3 × 8, edge to edge (e.g. Herma 4453, Avery Zweckform 3474)
  {
    id: "70x37",
    widthUm: 70_000,
    heightUm: 37_000,
    columns: 3,
    rows: 8,
    marginLeftUm: 0,
    marginTopUm: 500,
    gapXUm: 0,
    gapYUm: 0,
  },
  // 3 × 7 with margins (e.g. Avery L7160)
  {
    id: "63x38",
    widthUm: 63_500,
    heightUm: 38_100,
    columns: 3,
    rows: 7,
    marginLeftUm: 7_250,
    marginTopUm: 15_150,
    gapXUm: 2_500,
    gapYUm: 0,
  },
  // 4 × 10, edge to edge (e.g. Herma 4610)
  {
    id: "52x30",
    widthUm: 52_500,
    heightUm: 29_700,
    columns: 4,
    rows: 10,
    marginLeftUm: 0,
    marginTopUm: 0,
    gapXUm: 0,
    gapYUm: 0,
  },
] as const satisfies readonly LabelPreset[];

export type LabelPresetId = (typeof LABEL_PRESETS)[number]["id"];

export function findLabelPreset(id: string | undefined): LabelPreset {
  return LABEL_PRESETS.find((preset) => preset.id === id) ?? LABEL_PRESETS[0];
}

export function labelsPerSheet(preset: LabelPreset): number {
  return preset.columns * preset.rows;
}

export type PlacedLabel = { index: number; xUm: number; yUm: number };

/**
 * Lays out `count` labels over as many sheets as needed. `skip` leaves the
 * first cells of the first sheet empty, so a partly used sheet can be reused.
 * It is clamped to 0 … perSheet − 1.
 */
export function layoutLabelSheets(preset: LabelPreset, count: number, skip = 0): PlacedLabel[][] {
  const perSheet = labelsPerSheet(preset);
  const offset = Math.min(Math.max(Math.trunc(skip), 0), perSheet - 1);
  const sheets: PlacedLabel[][] = [];
  for (let index = 0; index < count; index++) {
    const cell = offset + index;
    const sheet = Math.floor(cell / perSheet);
    const inSheet = cell % perSheet;
    const column = inSheet % preset.columns;
    const row = Math.floor(inSheet / preset.columns);
    (sheets[sheet] ??= []).push({
      index,
      xUm: preset.marginLeftUm + column * (preset.widthUm + preset.gapXUm),
      yUm: preset.marginTopUm + row * (preset.heightUm + preset.gapYUm),
    });
  }
  return sheets;
}
