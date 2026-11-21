import type { APIRoute } from "astro";
import { el, renderPng } from "../lib/og";
import { site } from "../lib/data";

// The share card in the Poster style: the page's paper, ink and red mark, no gradient.
export const GET: APIRoute = () =>
  renderPng(
    el(
      "div",
      {
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        padding: "72px",
        background: "#fbfbf9",
        color: "#19191b",
        fontFamily: "Inter",
      },
      [
        el("div", { display: "flex", alignItems: "center", fontSize: 30, color: "#5b5b63" }, [
          el("div", { width: 14, height: 14, background: "#d70015", marginRight: 16 }),
          site.site.url.replace("https://", ""),
        ]),
        el("div", { display: "flex", flexDirection: "column" }, [
          el(
            "div",
            { display: "flex", fontSize: 136, fontWeight: 700, letterSpacing: "-6px", lineHeight: 1 },
            site.profile.name,
          ),
          el("div", { display: "flex", width: 1056, height: 6, background: "#19191b", marginTop: 36 }),
          el(
            "div",
            { display: "flex", fontSize: 40, marginTop: 24 },
            `${site.profile.title} at ${site.profile.employer}`,
          ),
        ]),
      ],
    ),
    1200,
    630,
  );
