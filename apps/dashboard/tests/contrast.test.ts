// Readable text on a shop's own colour (lib/contrast.ts).

import { describe, expect, it } from "vitest";
import { contrastRatio, luminance, readableOn, textOn } from "@/lib/contrast";

describe("text on a shop's colour", () => {
  it("measures contrast the WCAG way", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#00AD82", "#FFFFFF")).toBeCloseTo(2.87, 1);
    expect(luminance("nope")).toBeNull();
  });

  it("puts dark text on ZentraBite green, which white failed", () => {
    expect(textOn("#00AD82")).toBe("#0F1F2D");
    expect(contrastRatio("#00AD82", textOn("#00AD82"))).toBeGreaterThan(4.5);
  });

  it("puts white text on dark colours and dark text on light ones", () => {
    expect(textOn("#1C2D48")).toBe("#FFFFFF");
    expect(textOn("#7A1F1F")).toBe("#FFFFFF");
    expect(textOn("#FFC14B", "#111111")).toBe("#111111");
  });

  it("always picks the more readable of the two", () => {
    for (const bg of ["#00AD82", "#E63946", "#2A9D8F", "#F4A261", "#264653", "#8338EC", "#3A86FF", "#808080"]) {
      const pick = textOn(bg);
      const other = pick === "#FFFFFF" ? "#0F1F2D" : "#FFFFFF";
      expect(contrastRatio(bg, pick), bg).toBeGreaterThanOrEqual(contrastRatio(bg, other));
    }
  });

  it("darkens or lightens the shop's colour just enough for small text", () => {
    const onWhite = readableOn("#00AD82", "#FFFFFF");
    expect(contrastRatio(onWhite, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(onWhite).not.toBe("#000000");
    const onDark = readableOn("#1C2D48", "#16130F");
    expect(contrastRatio(onDark, "#16130F")).toBeGreaterThanOrEqual(4.5);
    expect(readableOn("#0F1F2D", "#FFFFFF")).toBe("#0F1F2D"); // already fine, kept
  });
});
