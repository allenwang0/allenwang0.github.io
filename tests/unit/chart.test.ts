import { readFileSync } from "node:fs";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Chart from "../../src/components/Chart.astro";
import type { Card, Chart as ChartData } from "../../src/lib/card";

const fixture = (slug: string): Card =>
  JSON.parse(readFileSync(new URL(`../../scripts/fixtures/${slug}.valid.fixture.json`, import.meta.url), "utf8"));

async function render(chart: ChartData): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Chart, { props: { chart, caption: "test chart" } });
}

const line = (points: [number, number][]): ChartData => ({
  type: "line",
  x_label: "Moneyness",
  x_unit: "",
  x_scale: "linear",
  y_label: "Implied volatility",
  y_unit: "%",
  y_scale: "linear",
  series: [{ name: "Quotes", style: "dots", points }],
});

describe("Chart component", () => {
  it("renders the empty state, not an empty plot, when a series has no points", async () => {
    const html = await render(line([]));
    expect(html).toContain("No data points to plot.");
    expect(html).not.toContain("<svg");
  });

  it("draws exactly one mark per variant for a one-point series", async () => {
    const html = await render(line([[1, 15]]));
    const svgs = html.match(/<svg class="chart-svg[\s\S]*?<\/svg>/g) ?? [];
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) expect(svg.match(/class="chart-mark"/g)).toHaveLength(1);
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it.each(["limitorderbook", "statarb", "volatilityscanner", "quantsim", "kalshibot", "tjs-sim"])(
    "renders the %s fixture with unit-labelled axes, at least 4 ticks and no NaN",
    async (slug) => {
      const card = fixture(slug);
      const chart = card.chart!;
      const html = await render(chart);
      expect(html).not.toMatch(/NaN|Infinity/);
      const title = chart.x_unit ? `${chart.x_label} (${chart.x_unit})` : chart.x_label;
      expect(html).toContain(title);
      if (chart.type === "line" && chart.y_unit) expect(html).toContain(`${chart.y_label} (${chart.y_unit})`);
      const narrow = html.match(/<svg class="chart-svg chart-narrow[\s\S]*?<\/svg>/)![0];
      const ticks = narrow.match(/class="chart-tick"/g)!.length - (chart.type === "interval" ? chart.rows.length : 0);
      expect(ticks).toBeGreaterThanOrEqual(chart.type === "line" ? 8 : 4);
      expect(html).toContain("<caption>test chart</caption>");
    },
  );

  it("separates series by line style, not color alone", async () => {
    const html = await render(fixture("statarb").chart!);
    expect(html).toMatch(/chart-line series-0 solid/);
    expect(html).toMatch(/chart-line series-1 dashed/);
  });
});
