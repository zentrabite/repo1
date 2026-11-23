// Tests for how a text is written and what it costs (lib/sms-text.ts):
//   \u2022 look-alike characters are made plain before a text goes
//   \u2022 parts are counted the way Twilio counts them
//   \u2022 the default win-back text fits one text
//   \u2022 no marketing text between 8pm and 9am, and the daily run lands
//     inside the hours everywhere in Australia, summer and winter

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { costLine, inQuietHours, plainSms, shopHour, smsBody, smsCost } from "@/lib/sms-text";
import { readOffer, winbackPreview, WINBACK_TEMPLATE } from "@/lib/offer-codes";

const B = String.fromCharCode(92); // a backslash, kept out of the source as an escape

describe("plain characters", () => {
  it("swaps curly quotes, long dashes, three dots and odd spaces", () => {
    const fancy = "We\u2019re \u201Copen\u201D \u2014 till 9\u2026\u00A0see\u200B you";
    expect(plainSms(fancy)).toBe("We're \"open\" - till 9... see you");
    expect(smsCost(plainSms(fancy)).encoding).toBe("plain");
    expect(smsCost(fancy).encoding).toBe("unicode");
  });

  it("every text that goes out is made plain", () => {
    expect(smsBody("must_reach", "Your order\u2019s ready", "Nonna's Kitchen")).toBe("Nonna's Kitchen: Your order's ready");
    expect(smsBody("marketing", "20% off \u2014 tonight", "Nonna's Kitchen")).toBe("Nonna's Kitchen: 20% off - tonight Reply STOP to opt out");
  });
});

describe("counting parts", () => {
  it("160 plain characters is one text, 161 is two of 153", () => {
    expect(smsCost("a".repeat(160))).toMatchObject({ encoding: "plain", length: 160, parts: 1 });
    expect(smsCost("a".repeat(161))).toMatchObject({ parts: 2, perPart: 153 });
    expect(smsCost("a".repeat(307)).parts).toBe(3);
  });

  it("a few plain characters take two places", () => {
    expect(smsCost(`\u20AC5 [deal] ${B}`).length).toBe(15); // the euro, both brackets and the backslash take two
    expect(smsCost("a".repeat(159) + "\u20AC").parts).toBe(2);
  });

  it("one emoji makes it unicode, 70 a part, and the emoji takes two", () => {
    const c = smsCost("Pizza night \uD83C\uDF55");
    expect(c).toMatchObject({ encoding: "unicode", length: 14, parts: 1, unicode: ["\uD83C\uDF55"] });
    expect(smsCost("a".repeat(69) + "\uD83C\uDF55").parts).toBe(2);
    expect(smsCost("a".repeat(130) + "\uD83C\uDF55").parts).toBe(2);
    expect(smsCost("a".repeat(133) + "\uD83C\uDF55").parts).toBe(3);
  });

  it("says it plainly", () => {
    expect(costLine(smsCost("a".repeat(143)))).toBe("143 of 160 characters, 1 text.");
    expect(costLine(smsCost("a".repeat(200)))).toBe("200 characters, sent as 2 texts, so it costs 2 times as much.");
    expect(smsCost("").parts).toBe(0);
  });
});

describe("the win-back text", () => {
  const NOW = new Date("2026-11-23T03:00:00Z");
  const shop = { name: "Nonna's Kitchen", subdomain: "nonna", settings: {} };

  it("starts as one text, whatever the offer", () => {
    for (const [type, value] of [["percent", 20], ["dollar", 10], ["free_delivery", 0]] as const) {
      const text = winbackPreview("", readOffer(type, value), shop, NOW);
      expect(smsCost(text), text).toMatchObject({ encoding: "plain", parts: 1 });
      expect(text).toContain("https://nonna.zentrabite.com/order?code=W4NTPRZZ");
      expect(text).toMatch(/until \w{3} \d{1,2} \w{3}:/);
      expect(text).toMatch(/Reply STOP to opt out$/);
    }
    expect(winbackPreview("", readOffer("percent", 20), shop, NOW)).toBe(
      "Sofia, we miss you at Nonna's Kitchen. Get 20% off online until Mon 7 Dec: https://nonna.zentrabite.com/order?code=W4NTPRZZ Reply STOP to opt out",
    );
  });

  it("a much longer shop name takes two, and the editor says so", () => {
    const text = winbackPreview(WINBACK_TEMPLATE, readOffer("free_delivery", 0), { name: "The Original Pasta Bar Glenelg", subdomain: "originalpastabar", settings: {} }, NOW);
    expect(smsCost(text).parts).toBe(2);
    expect(costLine(smsCost(text))).toMatch(/sent as 2 texts, so it costs 2 times as much/);
  });

  it("the old template took two", () => {
    const old = "Hey {name}, we miss you at {business}. Here's {offer} on your next online order: {link}";
    expect(smsCost(winbackPreview(old, readOffer("percent", 20), shop, NOW)).parts).toBe(2);
  });
});

describe("quiet hours", () => {
  it("no marketing texts from 8pm to 9am, in the shop's time zone", () => {
    const at = (iso: string) => inQuietHours(new Date(iso), "Australia/Adelaide"); // UTC+10:30 in November
    expect(at("2026-11-23T09:29:00Z")).toBe(false); // 7:59pm
    expect(at("2026-11-23T09:30:00Z")).toBe(true);  // 8:00pm
    expect(at("2026-11-22T22:29:00Z")).toBe(true);  // 8:59am
    expect(at("2026-11-22T22:30:00Z")).toBe(false); // 9:00am
    expect(shopHour(new Date("2026-11-22T14:00:00Z"), "Australia/Adelaide")).toBe(0); // 12:30am, not 24
  });

  it("the daily run lands inside the hours across Australia, summer and winter", () => {
    const cron = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as { crons: { path: string; schedule: string }[] };
    const schedule = cron.crons.find(c => c.path === "/api/automations/run")!.schedule;
    const [minute, hour] = schedule.split(" ").map(Number);
    for (const day of ["2026-01-15", "2026-07-15"]) {
      const run = new Date(`${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
      for (const tz of ["Australia/Adelaide", "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Hobart", "Australia/Perth", "Australia/Darwin"]) {
        expect(inQuietHours(run, tz), `${schedule} on ${day} in ${tz}`).toBe(false);
      }
    }
  });
});
