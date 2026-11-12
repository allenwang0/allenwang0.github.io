import type { APIRoute } from "astro";
import { el, renderPng } from "../lib/og";
import { site } from "../lib/data";

export const GET: APIRoute = () =>
  renderPng(
    el(
      "div",
      {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "linear-gradient(140deg, #fdfeff 0%, #f5f5f7 55%, #dfe9ff 100%)",
        fontFamily: "Inter",
      },
      [
        el("div", { fontSize: 104, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-3px" }, site.profile.name),
        el(
          "div",
          { fontSize: 44, color: "#5e5e63", marginTop: 24 },
          `${site.profile.title} at ${site.profile.employer}`,
        ),
        el("div", { fontSize: 28, color: "#0066cc", marginTop: 56 }, site.site.url.replace("https://", "")),
      ],
    ),
    1200,
    630,
  );
