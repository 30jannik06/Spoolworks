"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** 210 mm in CSS pixels (96 dpi). */
const SHEET_WIDTH_PX = (210 / 25.4) * 96;

/**
 * Scales the A4 sheets inside to the column width on screen (via the
 * --sheet-zoom variable that .label-sheet reads). Print ignores it and uses 1:1.
 */
export function SheetScaler({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const zoom = Math.min(1, element.clientWidth / SHEET_WIDTH_PX);
      element.style.setProperty("--sheet-zoom", zoom.toFixed(3));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full">
      {children}
    </div>
  );
}
