import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const site = JSON.parse(readFileSync("src/data/site.json", "utf8"));
const visible = site.projects.filter((p: { state: string }) => p.state !== "hidden");
const hidden = site.projects.filter((p: { state: string }) => p.state === "hidden");
const pages = ["/"];

test.beforeEach(async ({ context }) => {
  await context.route(/googletagmanager\.com/, (route) => route.abort());
});

test("viewport allows pinch-zoom at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const content = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(content).not.toContain("maximum-scale");
  expect(content).not.toContain("user-scalable");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every section's text is visible", async ({ page }) => {
    await page.goto("/");
    for (const text of [
      site.profile.name,
      "Experience",
      site.experience[0].summary,
      "Projects",
      visible[0].blurb[0].text,
      "Technical Stack",
      "Education",
      site.education[0].school,
      "Get in touch",
    ]) {
      await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
    }
  });
});

test.describe("dark system theme", () => {
  test.use({ colorScheme: "dark" });

  test("the first painted frame is already dark", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await page.waitForSelector("h1", { state: "attached" });
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(bg).toBe("rgb(0, 0, 0)");
    await page.screenshot({ path: "test-results/screenshots/first-frame-dark.png" });
  });
});

test("the page still renders when localStorage throws", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("storage blocked");
    };
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: site.profile.name })).toBeVisible();
  await expect(page.getByText(site.education[1].school)).toBeVisible();
  expect(errors).toEqual([]);
});

test("the theme toggle switches and remembers the theme", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme accessibility`, () => {
    test.use({ colorScheme: scheme });
    for (const path of pages) {
      test(`axe finds no violations on ${path}`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
      });
    }
  });
}

test("hidden projects have no card", async ({ page }) => {
  await page.goto("/");
  for (const p of hidden) await expect(page.locator(`[data-project="${p.slug}"]`)).toHaveCount(0);
});

test("project cards link to their repos and fit at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  for (const p of visible) {
    await expect(page.locator(`[data-project="${p.slug}"] h3 a`)).toHaveAttribute(
      "href",
      `https://github.com/${p.repo}`,
    );
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("the home page prints on one page", async ({ page }) => {
  await page.goto("/");
  const pdf = await page.pdf({ format: "Letter" });
  const count = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(count).toBe(1);
});
