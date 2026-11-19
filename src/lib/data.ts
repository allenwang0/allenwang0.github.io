import site from "../data/site.json";

export type Claim = { text: string; source: string | string[] };
export type Tag = { name: string; source: string };

type SiteProject = (typeof site.projects)[number];

export type Project = {
  slug: string;
  repo: string;
  title: string;
  icon: string;
  sha: string;
  blurb: Claim[];
  tags: Tag[];
};

export function repoUrl(repo: string): string {
  return `https://github.com/${repo}`;
}

function toProject(p: SiteProject): Project {
  if (!("sha" in p) || !p.sha || !("blurb" in p) || !p.blurb) {
    throw new Error(`${p.slug}: a visible project needs sha, blurb and tags in site.json`);
  }
  return {
    slug: p.slug,
    repo: p.repo,
    title: p.title,
    icon: p.icon,
    sha: p.sha,
    blurb: p.blurb as Claim[],
    tags: p.tags as Tag[],
  };
}

export const projects: Project[] = site.projects.filter((p) => p.state !== "hidden").map(toProject);

// Typed explicitly so an empty "listed" array in site.json still type-checks.
type Listed = { repo: string; title: string; sha: string; text: string; source: string | string[] };

export const listed = (site.listed as Listed[]).map((l) => ({ ...l, url: repoUrl(l.repo) }));

export { site };
