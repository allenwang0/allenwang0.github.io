import { describe, expect, it } from "vitest";
import { formatMetric } from "../../src/lib/card";

describe("formatMetric", () => {
  it("keeps a card's raw float from printing 16 decimals", () => {
    expect(formatMetric(-0.4401766751351071)).toBe("-0.44");
    expect(formatMetric(0.017645)).toBe("0.0176");
  });

  it("leaves integers and short values unchanged", () => {
    expect(formatMetric(41)).toBe("41");
    expect(formatMetric(270)).toBe("270");
    expect(formatMetric(10.41)).toBe("10.41");
    expect(formatMetric(99.2)).toBe("99.2");
    expect(formatMetric(0)).toBe("0");
  });
});
