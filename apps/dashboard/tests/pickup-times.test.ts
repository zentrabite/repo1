// Tests for opening hours and pick-up times (lib/pickup-times.ts).
// Adelaide is on daylight time in November, 10:30 ahead of UTC.

import { describe, expect, it } from "vitest";
import { breakProblem, checkPickup, pickupLabel, pickupPlan, readOrderingRules, shopTime, type OrderingRules } from "@/lib/pickup-times";

const WEEK = {
  mon: { open: "17:00", close: "21:00", closed: true },
  tue: { open: "17:00", close: "21:00", closed: false },
  wed: { open: "17:00", close: "21:00", closed: false },
  thu: { open: "17:00", close: "21:00", closed: false },
  fri: { open: "17:00", close: "01:00", closed: false }, // past midnight
  sat: { open: "11:30", close: "21:00", closed: false },
  sun: { open: "17:00", close: "21:00", closed: false },
};
const rules = (over: Partial<OrderingRules> = {}): OrderingRules =>
  ({ ...readOrderingRules({ hours: WEEK, timezone: "Australia/Adelaide", ordering: { prep_minutes: 20 } }), ...over });

// Friday 20 Nov 2026 in Adelaide (UTC+10:30).
const adl = (hm: string, day = 20) => {
  const [h, m] = hm.split(":").map(Number) as [number, number];
  return new Date(Date.UTC(2026, 10, day, h, m) - 10.5 * 3600_000);
};

describe("reading the rules", () => {
  it("falls back to sensible defaults", () => {
    expect(readOrderingRules(null)).toEqual({ week: null, timezone: "Australia/Adelaide", prepMinutes: 20, paused: false });
    expect(readOrderingRules({ timezone: "Mars/Olympus", ordering: { prep_minutes: 2 } })).toMatchObject({ timezone: "Australia/Adelaide", prepMinutes: 20 });
  });

  it("treats a day with bad times as closed", () => {
    const r = readOrderingRules({ hours: { tue: { open: "5pm", close: "21:00" } } });
    expect(r.week?.tue?.closed).toBe(true);
  });
});

describe("what the customer can pick", () => {
  it("offers as soon as possible and later times while open", () => {
    const plan = pickupPlan(rules(), adl("18:02"));
    expect(plan.state).toBe("open");
    if (plan.state !== "open") return;
    expect(shopTime(plan.asap, "Australia/Adelaide")).toBe("6:25pm");     // 6:02 plus 20 minutes, up to the next 5
    expect(shopTime(plan.slots[0]!, "Australia/Adelaide")).toBe("6:30pm");
    // Friday runs to 1am, so the last time is 1am.
    expect(shopTime(plan.slots.at(-1)!, "Australia/Adelaide")).toBe("1am");
  });

  it("takes orders ahead when it opens later today", () => {
    const plan = pickupPlan(rules(), adl("14:00"));
    expect(plan.state).toBe("later");
    if (plan.state !== "later") return;
    expect(shopTime(plan.slots[0]!, "Australia/Adelaide")).toBe("5:30pm"); // opens 5pm plus 20 minutes, on the quarter hour
  });

  it("is open after midnight on a late night", () => {
    const plan = pickupPlan(rules(), adl("00:20", 21)); // Saturday 12:20am, Friday's session
    expect(plan.state).toBe("open");
  });

  it("is closed once it's too close to closing time", () => {
    const plan = pickupPlan(rules(), adl("20:50", 19)); // Thursday, closes 9pm
    expect(plan).toEqual({ state: "closed", nextOpen: "Opens tomorrow 5pm" });
  });

  it("says when it opens next on a closed day", () => {
    // Monday 23 Nov is closed all day.
    expect(pickupPlan(rules(), adl("12:00", 23))).toEqual({ state: "closed", nextOpen: "Opens tomorrow 5pm" });
  });

  it("takes nothing while paused", () => {
    expect(pickupPlan(rules({ paused: true }), adl("18:00"))).toEqual({ state: "paused" });
  });

  it("works as before when no hours are saved", () => {
    const plan = pickupPlan(rules({ week: null }), adl("03:00"));
    expect(plan.state).toBe("anytime");
  });

  it("uses the prep time", () => {
    const plan = pickupPlan(rules({ prepMinutes: 45 }), adl("18:00"));
    expect(plan.state === "open" && shopTime(plan.asap, "Australia/Adelaide")).toBe("6:45pm");
  });
});

describe("checking the pick-up time at checkout", () => {
  it("accepts as soon as possible while open", () => {
    const r = checkPickup(rules(), "asap", adl("18:02"));
    expect(r.ok && r.asap).toBe(true);
    expect(r.ok && pickupLabel(r.pickupAt, true, "Australia/Adelaide")).toBe("As soon as possible, about 6:25pm");
  });

  it("accepts an offered time and refuses one that has gone", () => {
    expect(checkPickup(rules(), adl("19:00").toISOString(), adl("18:02"))).toMatchObject({ ok: true, asap: false });
    expect(checkPickup(rules(), adl("18:15").toISOString(), adl("18:02"))).toEqual({ ok: false, error: "That time has gone. Please pick another." });
  });

  it("refuses a time off the quarter hour or after closing", () => {
    expect(checkPickup(rules(), adl("19:07").toISOString(), adl("18:02")).ok).toBe(false);
    expect(checkPickup(rules(), adl("21:15", 19).toISOString(), adl("18:02", 19)).ok).toBe(false);
  });

  it("refuses as soon as possible before opening, and anything when closed or paused", () => {
    expect(checkPickup(rules(), "asap", adl("14:00")).ok).toBe(false);
    expect(checkPickup(rules(), adl("17:30").toISOString(), adl("14:00")).ok).toBe(true);
    expect(checkPickup(rules(), "asap", adl("12:00", 23))).toEqual({ ok: false, error: "We're closed for online orders right now. Opens tomorrow 5pm." });
    expect(checkPickup(rules({ paused: true }), "asap", adl("18:00")).ok).toBe(false);
  });

  it("allows only as soon as possible when no hours are saved", () => {
    expect(checkPickup(rules({ week: null }), "asap", adl("03:00")).ok).toBe(true);
    expect(checkPickup(rules({ week: null }), adl("19:00").toISOString(), adl("03:00")).ok).toBe(false);
  });
});

// ─── A break between lunch and dinner ────────────────────────────────────────
// Tuesday 17 Nov 2026: 11:30am to 9pm, shut 2pm to 5pm.

describe("a break between lunch and dinner", () => {
  const SPLIT = { ...WEEK, tue: { open: "11:30", close: "21:00", closed: false, break_from: "14:00", break_to: "17:00" } };
  const split = (over: Partial<OrderingRules> = {}): OrderingRules =>
    ({ ...readOrderingRules({ hours: SPLIT, timezone: "Australia/Adelaide", ordering: { prep_minutes: 20 } }), ...over });
  const tz = "Australia/Adelaide";
  const times = (ds: Date[]) => ds.map(d => shopTime(d, tz));

  it("keeps a good break when reading the hours, and drops a broken one", () => {
    expect(split().week?.tue).toEqual({ open: "11:30", close: "21:00", closed: false, break_from: "14:00", break_to: "17:00" });
    const r = readOrderingRules({ hours: { tue: { open: "11:30", close: "21:00", break_from: "2pm", break_to: "17:00" } } });
    expect(r.week?.tue).toEqual({ open: "11:30", close: "21:00", closed: false });
  });

  it("offers lunch times and dinner times at lunch, and nothing in the break", () => {
    const plan = pickupPlan(split(), adl("12:00", 17));
    expect(plan.state).toBe("open");
    if (plan.state !== "open") return;
    expect(shopTime(plan.asap, tz)).toBe("12:20pm");
    const list = times(plan.slots);
    expect(list.slice(0, 2)).toEqual(["12:30pm", "12:45pm"]);
    // 2pm is the last lunch time, then dinner from 5pm plus 20 minutes, on the quarter hour.
    expect(list[list.indexOf("2pm") + 1]).toBe("5:30pm");
    expect(list).not.toContain("3pm");
    expect(list.at(-1)).toBe("9pm");
  });

  it("takes dinner orders ahead in the break, or once lunch is too close to the break", () => {
    for (const at of ["13:50", "15:00"]) {
      const plan = pickupPlan(split(), adl(at, 17));
      expect(plan.state).toBe("later");
      if (plan.state !== "later") return;
      expect(shopTime(plan.opensAt, tz)).toBe("5pm");
      expect(shopTime(plan.slots[0]!, tz)).toBe("5:30pm");
    }
  });

  it("is open again for dinner", () => {
    const plan = pickupPlan(split(), adl("17:05", 17));
    expect(plan.state === "open" && shopTime(plan.asap, tz)).toBe("5:25pm");
  });

  it("refuses a time in the break at checkout", () => {
    const now = adl("12:00", 17);
    expect(checkPickup(split(), adl("15:00", 17).toISOString(), now)).toEqual({ ok: false, error: "We're closed then. Please pick another time." });
    expect(checkPickup(split(), adl("17:15", 17).toISOString(), now).ok).toBe(false); // the kitchen opens at 5
    expect(checkPickup(split(), adl("13:45", 17).toISOString(), now).ok).toBe(true);
    expect(checkPickup(split(), adl("17:30", 17).toISOString(), now).ok).toBe(true);
    expect(checkPickup(split(), "asap", adl("15:00", 17)).ok).toBe(false);
  });

  it("ignores a break that isn't inside the day", () => {
    const odd = { ...WEEK, tue: { open: "17:00", close: "21:00", closed: false, break_from: "14:00", break_to: "15:00" } };
    const plan = pickupPlan(readOrderingRules({ hours: odd, timezone: tz }), adl("18:00", 17));
    expect(plan.state === "open" && times(plan.slots)).toContain("7pm");
  });

  it("works for a break after midnight on a late night", () => {
    // Friday 6pm to 3am, shut midnight to 1am. Saturday 12:20am is in the break.
    const late = { ...WEEK, fri: { open: "18:00", close: "03:00", closed: false, break_from: "00:00", break_to: "01:00" } };
    const plan = pickupPlan(readOrderingRules({ hours: late, timezone: tz }), adl("00:20", 21));
    expect(plan.state).toBe("later");
    if (plan.state !== "later") return;
    expect(shopTime(plan.opensAt, tz)).toBe("1am");
    expect(shopTime(plan.slots[0]!, tz)).toBe("1:30am");
  });
});

describe("checking a break in the hours editors", () => {
  it("says what's wrong", () => {
    expect(breakProblem({ open: "11:30", close: "21:00", break_from: "14:00", break_to: "17:00" })).toBeNull();
    expect(breakProblem({ open: "17:00", close: "21:00", break_from: "14:00", break_to: "17:00" })).toBe("The break has to fall between opening and closing.");
    expect(breakProblem({ open: "11:30", close: "21:00", break_from: "", break_to: "17:00" })).toBe("Enter both break times.");
    expect(breakProblem({ open: "11:30", close: "21:00", closed: true, break_from: "", break_to: "" })).toBeNull();
    expect(breakProblem({ open: "11:30", close: "21:00" })).toBeNull();
  });
});
