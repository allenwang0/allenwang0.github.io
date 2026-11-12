import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://allenwang0.github.io",
  output: "static",
  trailingSlash: "always",
  vite: { plugins: [tailwindcss()] },
});
