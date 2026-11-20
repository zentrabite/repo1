// Split lunch and dinner hours outside ordering. The import turns two
// sessions into a break (lib/import/extract.ts), and the shop's website shows
// it (lib/site.ts).

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => null }));

import { weekFromSessions } from "@/lib/import/extract";
import { hoursLines, openNow } from "@/lib/site";

describe("the import", () => {
  it("keeps the gap between lunch and dinner as the day's break", () => {
    const week = weekFromSessions({
      tue: [{ open: "17:00", close: "21:00" }, { open: "11:30", close: "14:00" }],
      wed: [{ open: "11:30", close: "21:00" }],
      thu: [{ open: "07:00", close: "10:00" }, { open: "12:00", close: "14:00" }, { open: "17:00", close: "21:00" }],
    }, new Set(["tue", "wed", "thu"]));
    expect(week.tue).toEqual({ open: "11:30", close: "21:00", closed: false, break_from: "14:00", break_to: "17:00" });
    expect(week.wed).toEqual({ open: "11:30", close: "21:00", closed: false });
    // Three sessions can't be one break, so the day is left whole for staff to set.
    expect(week.thu).toEqual({ open: "07:00", close: "21:00", closed: false });
  });
});

describe("the shop's website", () => {
  const day = { open: "11:30", close: "21:00", closed: false, break_from: "14:00", break_to: "17:00" };
  const week = { mon: day, tue: day, wed: day, thu: day, fri: day, sat: { open: "17:00", close: "22:00", closed: false }, sun: { open: "", close: "", closed: true } };

  it("shows the break in the hours", () => {
    expect(hoursLines(week, null)).toEqual([
      { label: "Mon to Fri", value: "11:30am to 2pm, 5pm to 9pm" },
      { label: "Sat", value: "5pm to 10pm" },
      { label: "Sun", value: "Closed" },
    ]);
  });

  it("says when it opens again after the break", () => {
    // Tuesday 17 Nov 2026 in Adelaide, 10:30 ahead of UTC.
    const at = (hm: string) => {
      const [h, m] = hm.split(":").map(Number) as [number, number];
      return new Date(Date.UTC(2026, 10, 17, h, m) - 10.5 * 3600_000);
    };
    expect(openNow(week, "Australia/Adelaide", at("12:00"))).toBe("Open now until 2pm");
    expect(openNow(week, "Australia/Adelaide", at("15:00"))).toBe("Opens again 5pm today");
    expect(openNow(week, "Australia/Adelaide", at("18:00"))).toBe("Open now until 9pm");
  });
});
