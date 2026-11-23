// A clickable table row a keyboard can open (components/use-dialog.ts).
// The dialog side (focus in, Tab kept inside, Escape, focus back) needs a
// browser, so it was walked through with the fake login instead.

import { describe, expect, it, vi } from "vitest";
import type { KeyboardEvent } from "react";
import { rowKeys } from "@/components/use-dialog";

function press(key: string, onRow = true) {
  const target = {};
  const event = { key, target, currentTarget: onRow ? target : {}, preventDefault: vi.fn() };
  return event as unknown as KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> };
}

describe("a clickable row", () => {
  it("can be reached with Tab and looks clickable", () => {
    const row = rowKeys(() => {});
    expect(row.tabIndex).toBe(0);
    expect(row.className).toBe("zb-click");
  });

  it("opens with Enter or Space, and a click still works", () => {
    const opened = vi.fn();
    const row = rowKeys(opened);
    const enter = press("Enter");
    row.onKeyDown(enter);
    expect(enter.preventDefault).toHaveBeenCalled();
    row.onKeyDown(press(" "));
    row.onClick();
    expect(opened).toHaveBeenCalledTimes(3);
  });

  it("ignores other keys, and keys meant for a button inside the row", () => {
    const opened = vi.fn();
    const row = rowKeys(opened);
    row.onKeyDown(press("a"));
    row.onKeyDown(press("Tab"));
    row.onKeyDown(press("Enter", false));
    expect(opened).not.toHaveBeenCalled();
  });
});
