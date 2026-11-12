import type { APIRoute } from "astro";
import { el, renderPng } from "../lib/og";

export const GET: APIRoute = () =>
  renderPng(
    el(
      "div",
      {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0066cc",
        color: "#ffffff",
        fontFamily: "Inter",
        fontSize: 84,
        fontWeight: 700,
      },
      "AW",
    ),
    180,
    180,
  );
