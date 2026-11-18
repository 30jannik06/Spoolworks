import { describe, expect, it } from "vitest";

import { coverOrder, fitWithin, PRINT_PHOTO_LIMIT, sniffPhotoType } from "./photo";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

describe("sniffPhotoType", () => {
  it("recognises JPEG and WebP", () => {
    expect(sniffPhotoType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe("image/jpeg");
    expect(sniffPhotoType(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBP"), ...ascii("VP8 ")))).toBe("image/webp");
  });

  it("rejects everything else, whatever the file claims to be", () => {
    expect(sniffPhotoType(bytes(0x89, ...ascii("PNG\r\n"), 0x1a, 0x0a))).toBeNull();
    expect(sniffPhotoType(bytes(...ascii("<svg xmlns=")))).toBeNull();
    expect(sniffPhotoType(bytes(...ascii("<html><script>")))).toBeNull();
    expect(sniffPhotoType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")))).toBeNull();
    expect(sniffPhotoType(bytes(0, 0, 0, 0x18, ...ascii("ftypheic")))).toBeNull();
    expect(sniffPhotoType(bytes(0xff, 0xd8))).toBeNull();
    expect(sniffPhotoType(new Uint8Array())).toBeNull();
  });
});

describe("fitWithin", () => {
  it("scales the longest edge down and keeps the aspect ratio", () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("never upscales", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe("coverOrder", () => {
  it("moves the chosen photo to the front and keeps the rest in order", () => {
    expect(coverOrder(["a", "b", "c"], 2)).toEqual(["c", "a", "b"]);
    expect(coverOrder(["a", "b", "c"], 1)).toEqual(["b", "a", "c"]);
  });

  it("leaves the order alone for the cover itself or an unknown index", () => {
    expect(coverOrder(["a", "b"], 0)).toEqual(["a", "b"]);
    expect(coverOrder(["a", "b"], 5)).toEqual(["a", "b"]);
  });
});

it("allows a cover plus two more photos", () => {
  expect(PRINT_PHOTO_LIMIT).toBe(3);
});
