import { github, readJson, siteData, sources, visibleProjects, writeJson } from "./github.mjs";

const CACHE = new URL("../src/data/cache/claims.json", import.meta.url);

function claimsOf(project) {
  const cs = project.case_study ?? {};
  return [
    ...(project.blurb ?? []).map((c, i) => [`blurb[${i}]`, c]),
    ...(project.tags ?? []).map((c, i) => [`tags[${i}] "${c.name}"`, c]),
    ["case_study.problem", cs.problem],
    ["case_study.approach", cs.approach],
    ...(cs.approach?.excerpt ? [["case_study.approach.excerpt", { source: cs.approach.excerpt.path }]] : []),
    ...(cs.limitations ?? []).map((c, i) => [`case_study.limitations[${i}]`, c]),
  ];
}

async function pathExists(cache, repo, sha, path) {
  const key = `${repo}@${sha}:${path}`;
  if (key in cache) return cache[key];
  const res = await github(`/repos/${repo}/contents/${encodeURI(path)}?ref=${sha}`);
  if (res.status !== 200 && res.status !== 404) {
    throw new Error(`GitHub contents API returned ${res.status} for ${key}; cannot verify`);
  }
  cache[key] = res.status === 200;
  return cache[key];
}

const cache = readJson(CACHE, {});
const failures = [];
const report = [];

const groups = [
  ...visibleProjects().map((p) => ({ repo: p.repo, sha: p.sha, claims: claimsOf(p) })),
  ...siteData.listed.map((l) => ({ repo: l.repo, sha: l.sha, claims: [["listed", l]] })),
];

for (const { repo, sha, claims } of groups) {
  if (!/^[0-9a-f]{40}$/.test(sha ?? "")) {
    failures.push(`${repo}: missing or malformed pinned sha`);
    continue;
  }
  for (const [where, claim] of claims) {
    const paths = sources(claim);
    if (!claim || paths.length === 0) {
      failures.push(`${repo}: ${where} has no "source"`);
      continue;
    }
    for (const path of paths) {
      if (await pathExists(cache, repo, sha, path)) report.push(`${repo}@${sha.slice(0, 7)} ${where} -> ${path}`);
      else failures.push(`${repo}: ${where} source "${path}" does not exist at ${sha}`);
    }
  }
}

writeJson(CACHE, Object.fromEntries(Object.entries(cache).sort()));

if (failures.length) {
  console.error(`check-claims failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`check-claims: ${report.length} sourced claims verified\n${report.join("\n")}`);
