import { describe, expect, it } from "vitest";

import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/s/K7M2Q9XA")).toBe("/s/K7M2Q9XA");
  });

  it("drops absolute and protocol-relative URLs", () => {
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("/\\evil.example")).toBeNull();
  });

  it("treats missing values as no destination", () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext("")).toBeNull();
  });
});
