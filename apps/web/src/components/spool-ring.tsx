import type { ReactNode } from "react";

/** Relative luminance (0..1) of a "#rrggbb" colour; unknown formats count as dark. */
function luminance(hex: string): number {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return 0;
  const [r, g, b] = match.slice(1).map((part) => {
    const c = Number.parseInt(part, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * A spool as a ring: the arc shows how much is left, drawn in the filament's
 * own colour. `fraction` is clamped to 0..1. Very light filaments get a thin
 * outline so they stay visible on light backgrounds.
 */
export function SpoolRing({
  fraction,
  color,
  size = 44,
  thickness = 5,
  children,
  label,
}: {
  fraction: number;
  color?: string;
  size?: number;
  thickness?: number;
  children?: ReactNode;
  /** Accessible description, e.g. "PLA Matte Blau, 120 g übrig". */
  label?: string;
}) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const radius = (size - thickness) / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  // White/natural filament would vanish against the light track: outline it.
  const needsOutline = color ? luminance(color) > 0.7 : false;
  const arc = {
    cx: center,
    cy: center,
    r: radius,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeDasharray: `${clamped * circumference} ${circumference}`,
    transform: `rotate(-90 ${center} ${center})`,
  };

  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--muted)" strokeWidth={thickness} />
        {clamped > 0 && color && (
          <>
            {needsOutline && <circle {...arc} stroke="var(--muted-foreground)" strokeOpacity={0.45} strokeWidth={thickness + 1.5} />}
            <circle {...arc} stroke={color} strokeWidth={thickness} />
          </>
        )}
      </svg>
      {children && <span className="absolute inset-0 flex items-center justify-center">{children}</span>}
    </span>
  );
}
