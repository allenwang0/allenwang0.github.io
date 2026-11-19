# allenwang0.github.io

My personal site and project portfolio, live at https://allenwang0.github.io.

| Light                                          | Dark                                         |
| ---------------------------------------------- | -------------------------------------------- |
| ![Home page, light theme](docs/home-light.png) | ![Home page, dark theme](docs/home-dark.png) |

## Stack

- Astro static build with Tailwind CSS. No client framework; the only scripts are a small inline theme toggle and Google Analytics.
- Lucide icons are inlined as SVG at build time.
- GitHub Actions builds and deploys the site to GitHub Pages.

## Run locally

Node 22.23.4 or newer (`.nvmrc` pins 24).

```sh
npm ci
npm run dev        # http://localhost:4321
npm run build      # check-claims, then astro build into dist/
npm test           # Playwright against astro preview
```

Playwright needs Chromium once: `npx playwright install chromium`.

Other checks CI runs: `npm run lint`, `npm run check` (astro check), `npm run validate-html`, lychee with `lychee.toml`, and `npx lhci autorun` with the budgets in `lighthouserc.json`.

## Editing content

All content lives in `src/data/site.json`: profile, experience, projects, the "More projects" list, education and stack.

### Projects and the source rule

Each project has a `state`:

- `hidden`: not rendered anywhere.
- `today` or `after`: rendered as a card linking to the repo. Cards appear in the order they are listed.

A visible project pins a commit in `sha`. Every blurb and tag carries a `source`: a file path (or list of paths) in that repo. `scripts/check-claims.mjs` fails the build if a claim has no source or the path does not exist at the pinned SHA. It checks through the GitHub contents API and caches answers in `src/data/cache/claims.json`.

To add a project: add an entry with `state: "hidden"`, fill in `sha`, `blurb` and `tags` with sources, set `state` to `today`, and run `npm run build`.

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main`: it builds, commits the refreshed claims cache if it changed, and deploys `dist/` with `actions/deploy-pages`. In the repo settings, Pages source must be set to "GitHub Actions". `.github/workflows/ci.yml` runs the full check suite on pull requests.

## License

Code is MIT (see `LICENSE`). Site text is copyright Allen Wang, all rights reserved. The Apple, Millennium, Stanford and Oxford marks belong to their owners; sources are in `public/logos/SOURCES.md`.
