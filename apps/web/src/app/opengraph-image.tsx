import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { de } from "@/messages/de";

/**
 * The link preview (Discord, WhatsApp, iMessage, …) for every page that does
 * not bring its own. Rendered on request (a few ms). Raw colours on purpose: an
 * image has no CSS variables, these are the dark theme's tokens from globals.css.
 */
export const alt = de.linkPreview.alt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BACKGROUND = "#0e0e0d";
const FOREGROUND = "#f2f1ec";
const PRIMARY = "#f2b33d";
const BORDER = "#262624";

/** Geist (OFL, assets/fonts/OFL.txt), copied into the repo so file tracing ships it with the function. */
const fontDir = join(process.cwd(), "assets", "fonts");

/** SpoolMark (components/layout/spool-mark.tsx) as a plain SVG with fixed colours. */
function Mark({ size: px }: { size: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.5" fill="none" stroke={FOREGROUND} strokeOpacity="0.25" strokeWidth="3" />
      <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" fill="none" stroke={PRIMARY} strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.5" fill={FOREGROUND} />
    </svg>
  );
}

export default async function OpenGraphImage() {
  // Every weight used below must be loaded, or Satori measures with one face and draws with another.
  const [regular, medium, mono] = await Promise.all([
    readFile(join(fontDir, "Geist-Regular.ttf")),
    readFile(join(fontDir, "Geist-Medium.ttf")),
    readFile(join(fontDir, "GeistMono-Regular.ttf")),
  ]);
  const s = de.linkPreview;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: BACKGROUND,
        color: FOREGROUND,
        fontFamily: "Geist",
        padding: 72,
        position: "relative",
      }}
    >
      {/* The big spool, cut off at the right edge. */}
      <div style={{ position: "absolute", right: -150, top: 75, display: "flex" }}>
        <Mark size={480} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Mark size={52} />
          <span style={{ fontSize: 40, fontWeight: 500, letterSpacing: -0.5 }}>{de.app.name}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {s.headline.map((line) => (
            <span key={line} style={{ fontSize: 84, fontWeight: 500, lineHeight: 1.04, letterSpacing: -2.5 }}>
              {line}
            </span>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 26,
            width: 640,
          }}
        >
          <span style={{ fontFamily: "Geist Mono", fontSize: 26, color: PRIMARY }}>{s.domain}</span>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: medium, weight: 500, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
