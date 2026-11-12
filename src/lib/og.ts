import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const require = createRequire(import.meta.url);
const font = (weight: 400 | 700) =>
  readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`));

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

export async function renderPng(tree: Node, width: number, height: number): Promise<Response> {
  const svg = await satori(tree as never, {
    width,
    height,
    fonts: [
      { name: "Inter", data: font(400), weight: 400, style: "normal" },
      { name: "Inter", data: font(700), weight: 700, style: "normal" },
    ],
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}

export { el };
