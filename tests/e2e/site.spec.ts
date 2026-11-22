import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const site = JSON.parse(readFileSync("src/data/site.json", "utf8"));
const visible = site.projects.filter((p: { state: string }) => p.state !== "hidden");
const hidden = site.projects.filter((p: { state: string }) => p.state === "hidden");
const layouts = [
  { key: "e", name: "Poster" },
  { key: "c", name: "Résumé" },
  { key: "d", name: "Bento" },
];

test.beforeEach(async ({ context }) => {
  await context.route(/googletagmanager\.com/, (route) => route.abort());
});

const luminance = (rgb: string) => {
  const [r, g, b] = (rgb.match(/\d+/g) ?? []).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

test("viewport allows pinch-zoom at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const content = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(content).not.toContain("maximum-scale");
  expect(content).not.toContain("user-scalable");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  // The default layout is fully readable as plain HTML: who he is, where he works, where he studied, what he built.
  test("name, both jobs, both schools and every project title are visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: site.profile.name })).toBeVisible();
    for (const job of site.experience) await expect(page.getByText(job.company, { exact: true }).first()).toBeVisible();
    for (const edu of site.education) await expect(page.getByText(edu.school, { exact: true }).first()).toBeVisible();
    for (const p of visible) await expect(page.getByText(p.title, { exact: true }).first()).toBeVisible();
  });

  // Nothing can open without scripts, so the details must already be readable instead of locked away.
  test("job and project details are visible", async ({ page }) => {
    await page.goto("/");
    for (const id of ["x-apple", "x-stan", "x-p01", "x-p02"]) await expect(page.locator(`#${id}`)).toBeVisible();
    await expect(page.locator(".tog").first()).toBeHidden();
    // The carousel arrows need scripts, so every featured card must sit on the page, not off to the side.
    const rights = await page
      .locator(".feat > .proj")
      .evaluateAll((cards) => cards.map((c) => c.getBoundingClientRect().right));
    for (const r of rights) expect(r).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  });
});

test.describe("dark system theme", () => {
  test.use({ colorScheme: "dark" });

  // No white flash for visitors on dark mode: the very first frame must already be dark.
  test("the first painted frame is already dark", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await page.waitForSelector("h1", { state: "attached" });
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(luminance(bg)).toBeLessThan(30);
  });
});

test("the page still renders when localStorage throws", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("storage blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("storage blocked");
    };
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: site.profile.name })).toBeVisible();
  await page.getByRole("radio", { name: "Bento" }).check({ force: true });
  await expect(page.locator("html")).toHaveAttribute("data-layout", "d");
  expect(errors).toEqual([]);
});

// The toggle names the action it will take ("Dark mode" while light), and the choice survives a reload.
test("the theme toggle switches and remembers the theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Light mode" })).toBeAttached();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Light mode" })).toBeAttached();
});

// Each layout is a shareable URL and the switcher reflects it; switching keeps the URL in sync for sharing.
test("every layout is reachable by URL and by the switcher", async ({ page }) => {
  for (const l of layouts) {
    await page.goto(`/?layout=${l.key}`);
    await expect(page.locator("html")).toHaveAttribute("data-layout", l.key);
    await expect(page.getByRole("radio", { name: l.name })).toBeChecked();
  }
  await page.goto("/?layout=e");
  await page.getByRole("radio", { name: "Bento" }).check({ force: true });
  await expect(page.locator("html")).toHaveAttribute("data-layout", "d");
  // URLs use readable names so a shared link says what it shows.
  await expect(page).toHaveURL(/layout=bento/);
  await page.goto("/?layout=resume#projects");
  await expect(page.locator("html")).toHaveAttribute("data-layout", "c");
  await expect(page.locator("#projects")).toBeInViewport();
  // Keynote was removed; old links to it land on a real layout (the visitor's last choice, else Poster) instead of breaking.
  await page.goto("/?layout=b");
  await expect(page.locator("html")).toHaveAttribute("data-layout", /^[ecd]$/);
  await expect(page.getByRole("radio", { name: "Keynote" })).toHaveCount(0);
});

// The design promise: on a laptop window everything fits on one screen with no scrolling.
for (const size of [
  { width: 1280, height: 650 },
  { width: 1440, height: 790 },
  { width: 1920, height: 960 },
]) {
  test(`every layout fits one screen at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    for (const l of layouts) {
      await page.goto(`/?layout=${l.key}`);
      const overflow = await page.evaluate(() => ({
        y: document.documentElement.scrollHeight - innerHeight,
        x: document.documentElement.scrollWidth - innerWidth,
      }));
      expect(overflow, `${l.name} at ${size.width}x${size.height}`).toEqual({ x: 0, y: 0 });
    }
  });
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme accessibility`, () => {
    test.use({ colorScheme: scheme });
    for (const l of layouts) {
      test(`axe finds no violations in the ${l.name} layout`, async ({ page }) => {
        await page.goto(`/?layout=${l.key}`);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
      });
    }
  });
}

// Opening one row's details must never hide another row: details open in place, one at a time.
for (const l of layouts.filter((x) => x.key !== "d")) {
  test(`opening details in ${l.name} covers no other row`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 790 });
    await page.goto(`/?layout=${l.key}`);
    for (const id of ["x-apple", "x-stan", "x-p01", "x-p02"]) {
      await page.locator(`button[aria-controls="${id}"]`).dispatchEvent("click");
      await expect(page.locator(`#${id}`)).toBeVisible();
      const covered = await page.evaluate((open) => {
        const me = document.getElementById(open)!.closest(".job, .school, .proj");
        return [...document.querySelectorAll(".job, .school, .more > .proj, .feat > .proj:not(.off)")]
          .filter((row) => row !== me)
          .filter((row) => {
            const b = row.getBoundingClientRect();
            if (!b.width || b.bottom < 0 || b.top > innerHeight) return false;
            const hit = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(b.height / 2, 14));
            return !!hit && !row.contains(hit);
          })
          .map((row) => row.textContent?.trim().slice(0, 30));
      }, id);
      expect(covered, id).toEqual([]);
      await expect(page.locator('[aria-expanded="true"]')).toHaveCount(1);
    }
  });
}

// A shared project link lands on that project with its details open, even when it starts off screen in the carousel.
test("a project link opens that project in every layout", async ({ page }) => {
  for (const l of layouts) {
    await page.goto(`/?layout=${l.key}#facelapse`);
    await expect(page.locator("#facelapse")).toHaveClass(/open/);
    await expect(page.locator("#facelapse .pt")).toBeInViewport();
  }
});

// Employer and school names link out, and the row-wide open button must not swallow those clicks in any layout.
test("employer and school names are working links in every layout", async ({ page }) => {
  const links = {
    Apple: "https://apple.com/",
    Millennium: "https://mlp.com/",
    "Stanford University": "https://mcs.stanford.edu/",
    "University of Oxford": "https://oxford.stanford.edu/",
  };
  await page.route(/^https:\/\/(apple|mlp|mcs|oxford)/, (route) => route.fulfill({ body: "ok" }));
  for (const l of layouts) {
    for (const [name, url] of Object.entries(links)) {
      await page.goto(`/?layout=${l.key}`);
      await page.getByRole("link", { name, exact: true }).click({ timeout: 3000 });
      await expect(page, `${name} in ${l.name}`).toHaveURL(new RegExp(`^${url}`));
    }
  }
});

// "Copied" must mean copied: when the browser refuses, the visitor gets the link to copy by hand instead.
test("a failed copy shows the link instead of claiming success", async ({ page }) => {
  await page.goto("/?layout=bento&utm_source=x");
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error("denied"));
    document.execCommand = () => false;
  });
  await page.locator(".copy").evaluate((b: HTMLElement) => b.click());
  await expect(page.locator(".copy")).not.toHaveClass(/copied/);
  await expect(page.locator("#copy-url")).toBeFocused();
  // The shared address keeps the layout and drops anything else in the query.
  await expect(page.locator("#copy-url")).toHaveValue(/\?layout=bento$/);
});

test("hidden projects are not on the page", async ({ page }) => {
  await page.goto("/");
  for (const p of hidden) await expect(page.locator(`a[href="https://github.com/${p.repo}"]`)).toHaveCount(0);
});

test("every visible project links to its repo and every layout fits at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const l of layouts) {
    await page.goto(`/?layout=${l.key}`);
    for (const p of visible) {
      await expect(page.locator(`a[href="https://github.com/${p.repo}"]`).first()).toBeAttached();
    }
    expect(await noHorizontalOverflow(page), l.name).toBe(true);
  }
});

// Recruiters print or save as PDF: the page must fit one Letter page (it prints the Résumé arrangement).
test("the home page prints on one page", async ({ page }) => {
  await page.goto("/");
  const pdf = await page.pdf({ format: "Letter" });
  const count = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(count).toBe(1);
});

// A wrong URL should still feel like this site and always offer a way back home.
for (const scheme of ["light", "dark"] as const) {
  test.describe(`404 page (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    test("shows 404, links home, and has no axe violations", async ({ page }) => {
      await page.goto("/404.html");
      await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });
  });
}
