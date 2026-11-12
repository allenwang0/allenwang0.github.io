import { readFileSync, writeFileSync } from "node:fs";

export const siteData = JSON.parse(readFileSync(new URL("../src/data/site.json", import.meta.url), "utf8"));

export function readJson(url, fallback) {
  try {
    return JSON.parse(readFileSync(url, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

export function writeJson(url, value) {
  writeFileSync(url, JSON.stringify(value, null, 2) + "\n");
}

export async function github(path) {
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return fetch(`https://api.github.com${path}`, { headers });
}

export function sources(claim) {
  if (!claim || claim.source === undefined) return [];
  return Array.isArray(claim.source) ? claim.source : [claim.source];
}

export function visibleProjects() {
  return siteData.projects.filter((p) => p.state !== "hidden");
}
