// Temporary audit (not committed). Usage: node scripts/_audit.mjs <poster|resume|bento>
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const lay = process.argv[2];
const V = [[320,640],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1280,800],[1440,900],[1728,1117],[1920,1080],[1440,600],[1280,1400],[844,390]];
const OPEN = new Set(["390x844", "1024x768", "1440x900"]);
const browser = await chromium.launch();
const out = [];
for (const th of ["light", "dark"]) {
  const ctx = await browser.newContext({ reducedMotion: "reduce", colorScheme: th });
  const p = await ctx.newPage();
  for (const [w, h] of V) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(`http://localhost:4321/?layout=${lay}&theme=${th}`);
    const res = await p.evaluate(() => {
      const r = [];
      const de = document.documentElement;
      if (de.scrollWidth > de.clientWidth + 1) r.push(`hscroll ${de.scrollWidth}>${de.clientWidth}`);
      const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.visibility !== "hidden" && s.display !== "none" && b.width > 0 && b.height > 0 && !(e.closest(".f2") && !e.closest(".open")); };
      for (const e of document.querySelectorAll("a, button, label")) {
        if (!vis(e)) continue;
        const b = e.getBoundingClientRect();
        if (b.width < 24 || b.height < 24) r.push(`small-target ${e.className || e.tagName} "${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${b.width.toFixed(0)}x${b.height.toFixed(0)}`);
      }
      for (const e of document.querySelectorAll(".name, .co, .sn, .pt, .role, .lbl, .more-h, .sl li, .soc a, .foot a")) {
        if (!vis(e)) continue;
        const b = e.getBoundingClientRect();
        if (b.right > innerWidth + 1 || b.left < -1) r.push(`offscreen ${e.className} "${e.textContent.trim().slice(0, 24)}" ${b.left.toFixed(0)}..${b.right.toFixed(0)}`);
      }
      const sw = document.querySelector(".sw");
      if (getComputedStyle(sw).position === "fixed") {
        const s = sw.getBoundingClientRect();
        const atEnd = scrollY + innerHeight >= de.scrollHeight - 2;
        for (const e of document.querySelectorAll(".name, .co, .sn, .pt, .logo, .seal, .pic, .lbl, .sl li, .soc a, .foot a")) {
          if (!vis(e)) continue;
          const b = e.getBoundingClientRect();
          if (b.left < s.right && b.right > s.left && b.top < s.bottom && b.bottom > s.top && (innerWidth >= 640 || atEnd)) r.push(`switcher-overlap ${e.className} "${e.textContent.trim().slice(0, 20)}"`);
        }
      }
      const pg = document.querySelector(".page"), ps = getComputedStyle(pg);
      if (/clip|hidden/.test(ps.overflow) || ps.height.endsWith("px") && pg.scrollHeight > pg.clientHeight + 1 && /clip|hidden/.test(ps.overflowY)) {
        for (const e of document.querySelectorAll(".foot, .sl, .more")) { const b = e.getBoundingClientRect(); if (b.bottom > innerHeight + 1 && b.bottom > pg.getBoundingClientRect().bottom) r.push(`cut-off ${e.className} bottom=${b.bottom.toFixed(0)}`); }
      }
      return r;
    });
    // phone: scroll to the end and check the pinned switcher clears everything
    if (w < 640) {
      await p.evaluate(() => scrollTo(0, 1e6));
      res.push(...await p.evaluate(() => {
        const s = document.querySelector(".sw").getBoundingClientRect();
        return [...document.querySelectorAll(".page h1,.page h2,.page h3,.page h4,.page li,.page p,.foot a")].filter((n) => { const b = n.getBoundingClientRect(); return b.width && b.left < s.right && b.right > s.left && b.top < s.bottom && b.bottom > s.top; }).map((n) => `switcher-covers-at-end "${n.textContent.trim().slice(0, 20)}"`);
      }));
      await p.evaluate(() => scrollTo(0, 0));
    }
    if (w === 1440 && h === 900 || w === 390) {
      const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      for (const v of axe.violations) res.push(`axe ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")}`);
    }
    if (OPEN.has(`${w}x${h}`)) {
      const n = await p.locator(".tog").count();
      for (let i = 0; i < n; i++) {
        const t = p.locator(".tog").nth(i);
        const box = await t.boundingBox();
        if (!box || box.x < 0 || box.x + box.width > w) continue;
        await t.scrollIntoViewIfNeeded();
        await t.click({ force: true });
        await p.waitForTimeout(40);
        res.push(...await p.evaluate(() => {
          const o = document.querySelector(".open"); if (!o) return ["no-open-after-click"];
          const f = o.querySelector(".f2").getBoundingClientRect(), r = [], id = o.id || o.className;
          if (f.right > innerWidth + 1) r.push(`panel-offright ${id} ${f.right.toFixed(0)}`);
          const de = document.documentElement; if (de.scrollWidth > de.clientWidth + 1) r.push(`panel-hscroll ${id}`);
          const pg = document.querySelector(".page");
          if (/clip|hidden/.test(getComputedStyle(pg).overflow) && f.bottom > pg.getBoundingClientRect().bottom + 1) r.push(`panel-clipped-by-page ${id} ${f.bottom.toFixed(0)}`);
          const sw = document.querySelector(".sw").getBoundingClientRect();
          if (innerWidth >= 640 && f.left < sw.right && f.top < sw.bottom && f.bottom > sw.top) r.push(`panel-under-switcher ${id}`);
          return r;
        }));
        await p.keyboard.press("Escape");
        await t.click({ force: true }).catch(() => {});
        await p.evaluate(() => document.querySelectorAll(".open .tog").forEach((b) => b.click()));
      }
    }
    const u = [...new Set(res)];
    if (u.length) out.push(`## ${lay}/${th}/${w}x${h}\n` + u.map((x) => "  " + x).join("\n"));
  }
  await ctx.close();
}
await browser.close();
console.log(out.join("\n") || `${lay}: clean`);
