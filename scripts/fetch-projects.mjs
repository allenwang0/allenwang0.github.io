import { github, readJson, siteData, visibleProjects, writeJson } from "./github.mjs";
import { formatErrors, validateCard } from "./validate-card.mjs";

const CACHE = new URL("../src/data/cache/projects.json", import.meta.url);

async function raw(repo, sha, path) {
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/${sha}/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`raw.githubusercontent.com returned ${res.status} for ${repo}/${sha}/${path}`);
  return res.text();
}

async function repoMeta(repo) {
  const res = await github(`/repos/${repo}`);
  if (!res.ok) throw new Error(`GitHub API returned ${res.status} for ${repo}`);
  const d = await res.json();
  return { description: d.description, language: d.language, pushed_at: d.pushed_at };
}

async function isAncestorOrEqual(repo, base, head) {
  const res = await github(`/repos/${repo}/compare/${base}...${head}`);
  if (!res.ok) throw new Error(`GitHub compare API returned ${res.status} for ${repo} ${base}...${head}`);
  const { status } = await res.json();
  return status === "identical" || status === "ahead";
}

async function cardFor(project) {
  const slug = project.slug;
  const text = await raw(project.repo, project.sha, "site/card.json");
  if (text === null) return null;
  const result = validateCard(text, slug);
  if (!result.ok) throw Object.assign(new Error(formatErrors(slug, result.errors)), { fatal: true });
  if (!(await isAncestorOrEqual(project.repo, result.card.sha, project.sha))) {
    throw Object.assign(
      new Error(`${slug}: card.json sha ${result.card.sha} is not an ancestor of pinned sha ${project.sha}`),
      { fatal: true },
    );
  }
  return result.card;
}

async function excerptFor(project) {
  const ex = project.case_study?.approach?.excerpt;
  if (!ex) return null;
  const text = await raw(project.repo, project.sha, ex.path);
  if (text === null) throw new Error(`${project.slug}: excerpt ${ex.path} not found at ${project.sha}`);
  return {
    ...ex,
    code: text
      .split("\n")
      .slice(ex.start - 1, ex.end)
      .join("\n"),
    permalink: `https://github.com/${project.repo}/blob/${project.sha}/${ex.path}#L${ex.start}-L${ex.end}`,
  };
}

const cache = readJson(CACHE, { repos: {} });
const out = { repos: {} };
let warnings = 0;

const targets = [
  ...visibleProjects().map((p) => ({ ...p, featured: true })),
  ...siteData.listed.map((l) => ({ repo: l.repo, sha: l.sha, featured: false })),
];

for (const project of targets) {
  const cached = cache.repos[project.repo];
  try {
    const entry = { sha: project.sha, ...(await repoMeta(project.repo)) };
    if (project.featured) {
      entry.card = await cardFor(project);
      entry.excerpt = await excerptFor(project);
    }
    out.repos[project.repo] = entry;
  } catch (err) {
    if (err.fatal) {
      console.error(err.message);
      process.exit(1);
    }
    warnings++;
    if (cached && cached.sha === project.sha) {
      console.warn(`warning: ${err.message}; using cached data for ${project.repo}`);
      out.repos[project.repo] = cached;
    } else {
      console.warn(`warning: ${err.message}; no cached data for ${project.repo} at ${project.sha}`);
    }
  }
}

writeJson(CACHE, out);
console.log(`fetch-projects: ${Object.keys(out.repos).length} repos written, ${warnings} warnings`);
