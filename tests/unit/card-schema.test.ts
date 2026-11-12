import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateCard } from "../../scripts/validate-card.mjs";

const dir = new URL("../../scripts/fixtures/", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
const featured = ["limitorderbook", "statarb", "volatilityscanner", "quantsim", "kalshibot", "tjs-sim"];

describe("card.json schema v1", () => {
  it.each(featured)("accepts the %s fixture, so each repo has a known-good shape to copy", (slug) => {
    const result = validateCard(read(`${slug}.valid.fixture.json`), slug);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it("labels every fixture as synthetic so fixture numbers can never pass as results", () => {
    for (const name of readdirSync(dir))
      expect(JSON.parse(read(name).replace("1e999", "0")).data_note).toMatch(/SYNTHETIC/);
  });

  it("rejects a card without sha, because a number must trace to the commit that produced it", () => {
    const result = validateCard(read("invalid-missing-sha.fixture.json"), "limitorderbook");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes("sha"))).toBe(true);
  });

  it("rejects a non-finite metric, which would render as Infinity or NaN", () => {
    const result = validateCard(read("invalid-non-finite.fixture.json"), "statarb");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.path)).toContain("/metric/value");
  });

  it("rejects an interval row with low > mid and names the failing JSON path", () => {
    const result = validateCard(read("invalid-interval-low-above-mid.fixture.json"), "tjs-sim");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.path)).toContain("/chart/rows/0");
  });

  it("rejects a card published under another repo's name", () => {
    const result = validateCard(read("statarb.valid.fixture.json"), "quantsim");
    expect(result.ok).toBe(false);
  });

  it("rejects a takeaway longer than 140 characters", () => {
    const card = JSON.parse(read("statarb.valid.fixture.json"));
    card.takeaway = "x".repeat(141);
    expect(validateCard(JSON.stringify(card), "statarb").ok).toBe(false);
  });

  it("rejects files over 200 KB", () => {
    const card = JSON.parse(read("statarb.valid.fixture.json"));
    card.data_note = "SYNTHETIC " + "x".repeat(210 * 1024);
    expect(validateCard(JSON.stringify(card), "statarb").ok).toBe(false);
  });
});
