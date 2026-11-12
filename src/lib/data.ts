import site from "../data/site.json";
import cache from "../data/cache/projects.json";
import { formatErrors, validateCard } from "../../scripts/validate-card.mjs";
import type { Card } from "./card";

export type Claim = { text: string; source: string | string[] };
export type Tag = { name: string; source: string };
export type Excerpt = { path: string; start: number; end: number; code: string; permalink: string };

type RepoCache = {
  sha: string;
  description: string | null;
  language: string | null;
  pushed_at: string;
  card?: unknown;
  excerpt?: Excerpt | null;
};

type SiteProject = (typeof site.projects)[number];

export type Project = {
  slug: string;
  repo: string;
  title: string;
  icon: string;
  group: string;
  sha: string;
  blurb: Claim[];
  tags: Tag[];
  caseStudy: {
    problem: Claim;
    approach: Claim;
    limitations: Claim[];
  };
  pushedAt: string | null;
  card: Card | null;
  excerpt: Excerpt | null;
};

const repos = cache.repos as Record<string, RepoCache>;

export function repoUrl(repo: string): string {
  return `https://github.com/${repo}`;
}

export function sourceUrl(repo: string, sha: string, path: string): string {
  return `https://github.com/${repo}/blob/${sha}/${path}`;
}

export function sourcesOf(claim: { source: string | string[] }): string[] {
  return Array.isArray(claim.source) ? claim.source : [claim.source];
}

function cachedFor(repo: string, sha: string): RepoCache | null {
  const entry = repos[repo];
  return entry && entry.sha === sha ? entry : null;
}

function toProject(p: SiteProject): Project {
  if (!("sha" in p) || !p.sha || !("case_study" in p) || !p.case_study) {
    throw new Error(`${p.slug}: a visible project needs sha, blurb, tags and case_study in site.json`);
  }
  const cached = cachedFor(p.repo, p.sha);
  let card: Card | null = null;
  if (cached?.card) {
    const result = validateCard(JSON.stringify(cached.card), p.slug);
    if (!result.ok) throw new Error(formatErrors(p.slug, result.errors));
    card = result.card;
  }
  return {
    slug: p.slug,
    repo: p.repo,
    title: p.title,
    icon: p.icon,
    group: p.group,
    sha: p.sha,
    blurb: p.blurb as Claim[],
    tags: p.tags as Tag[],
    caseStudy: p.case_study as Project["caseStudy"],
    pushedAt: cached?.pushed_at ?? null,
    card,
    excerpt: cached?.excerpt ?? null,
  };
}

export const projects: Project[] = site.projects.filter((p) => p.state !== "hidden").map(toProject);

export const projectGroups = site.project_groups
  .map((g) => ({ ...g, projects: projects.filter((p) => p.group === g.id) }))
  .filter((g) => g.projects.length > 0);

export const listed = site.listed.map((l) => ({ ...l, url: repoUrl(l.repo) }));

export function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export { site };
