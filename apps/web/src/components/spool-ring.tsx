import type { ReactNode } from "react";

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
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${clamped * circumference} ${circumference}`}
              transform={`rotate(-90 ${center} ${center})`}
            />
            <circle
              cx={center}
              cy={center}
              r={radius + thickness / 2}
              fill="none"
              stroke="var(--border)"
              strokeWidth={0.75}
            />
          </>
        )}
      </svg>
      {children && <span className="absolute inset-0 flex items-center justify-center">{children}</span>}
    </span>
  );
}
