import { fitWithin, PHOTO_MAX_BYTES, PHOTO_MAX_EDGE, THUMB_MAX_BYTES, THUMB_MAX_EDGE } from "@spoolworks/core";

/**
 * Browser side of a photo upload: decode, shrink, re-encode as JPEG. Drawing
 * onto a canvas keeps only pixels, so EXIF data (GPS position, camera serial)
 * never leaves the phone. There is deliberately no fallback to the original
 * file: if the browser cannot decode it (e.g. HEIC on Android), it fails.
 */

export type PreparedPhoto = { photo: Blob; thumb: Blob; width: number; height: number };

async function decode(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // <img> applies the EXIF rotation, so the pixels come out upright
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function render(img: HTMLImageElement, maxEdge: number, maxBytes: number) {
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff"; // transparent PNGs would otherwise turn black in JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  for (const quality of [0.85, 0.75, 0.65, 0.5]) {
    const blob = await toJpeg(canvas, quality);
    if (blob && blob.size <= maxBytes) return { blob, width, height };
  }
  return null;
}

export async function preparePhoto(file: File): Promise<PreparedPhoto | null> {
  try {
    const img = await decode(file);
    if (!img.naturalWidth || !img.naturalHeight) return null;
    const full = await render(img, PHOTO_MAX_EDGE, PHOTO_MAX_BYTES);
    const thumb = await render(img, THUMB_MAX_EDGE, THUMB_MAX_BYTES);
    if (!full || !thumb) return null;
    return { photo: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } catch {
    return null;
  }
}
