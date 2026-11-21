import type { APIRoute } from "astro";
import { site } from "../lib/data";

export const GET: APIRoute = () => {
  const reports = site.projects.flatMap((p) => ("report" in p && p.report && p.state !== "hidden" ? [p.report] : []));
  const urls = [new URL("/", site.site.url).href, ...reports].map((u) => `  <url><loc>${u}</loc></url>`).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
