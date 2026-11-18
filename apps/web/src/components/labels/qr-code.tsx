import type { CSSProperties } from "react";
import { encode } from "uqr";

/**
 * QR code as inline SVG, rendered on the server (no client JS). Always black
 * on white whatever the theme: inverted codes scan badly, and labels are paper.
 */
export function QrCode({
  value,
  label,
  className,
  style,
}: {
  value: string;
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { size, data } = encode(value, { ecc: "M", border: 1 });
  let path = "";
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) path += `M${x} ${y}h1v1h-1z`;
    });
  });
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      className={className}
      style={style}
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
