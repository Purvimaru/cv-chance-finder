import type { Job } from "./sources";

const STOP = new Set(["and", "the", "of", "for", "a", "an", "to", "in", "with", "senior", "junior", "lead", "sr", "jr"]);
export const words = (s: string) =>
  s.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1 && !STOP.has(w));

export type Filters = { title: string; location: string; remoteOnly: boolean; level: string };

const LEVEL_RX = {
  entry: /\b(junior|jr|entry|graduate|intern|associate)\b/i,
  senior: /\b(senior|sr|lead|staff|principal|head|director)\b/i,
};

/** Keep jobs whose title matches the search, respecting location/remote/level, then rank by skill overlap. */
export function prefilter(jobs: Job[], f: Filters, skills: string[], limit = 30): Job[] {
  const titleWords = words(f.title);
  const loc = f.location.trim().toLowerCase();
  const skillSet = new Set(skills.flatMap((s) => words(s)));
  const seen = new Set<string>();
  const scored: { job: Job; score: number }[] = [];
  for (const j of jobs) {
    if (!j.title || !j.url) continue;
    const key = `${j.title}|${j.company}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const t = j.title.toLowerCase();
    const titleHits = titleWords.filter((w) => t.includes(w)).length;
    if (titleWords.length && titleHits === 0) continue;
    if (f.remoteOnly && !j.remote) continue;
    if (loc && !j.location.toLowerCase().includes(loc) && !(j.remote && !f.remoteOnly)) continue;
    if (f.level === "entry" && LEVEL_RX.senior.test(j.title)) continue;
    if ((f.level === "mid") && /\b(intern|principal|director|head)\b/i.test(j.title)) continue;
    if (f.level === "senior" && LEVEL_RX.entry.test(j.title)) continue;
    const text = `${j.title} ${j.description}`.toLowerCase();
    let overlap = 0;
    for (const s of skillSet) if (text.includes(s)) overlap++;
    scored.push({ job: j, score: titleHits * 5 + overlap });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.job);
}
