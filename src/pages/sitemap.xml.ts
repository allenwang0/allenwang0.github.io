import type { APIRoute } from "astro";
import { projects, site } from "../lib/data";

export const GET: APIRoute = () => {
  const paths = ["/", ...projects.map((p) => `/projects/${p.slug}/`)];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site.site.url).href}</loc></url>`).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
