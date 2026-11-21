import type { APIRoute } from "astro";
import { el, renderPng } from "../lib/og";

// Home-screen icon: the favicon's "A" on the same near-black square (iOS rounds the corners).
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
        background: "#111111",
        color: "#ffffff",
        fontFamily: "Inter",
        fontSize: 118,
        fontWeight: 700,
      },
      "A",
    ),
    180,
    180,
  );
