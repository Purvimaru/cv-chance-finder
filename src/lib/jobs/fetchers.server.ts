import { stripHtml, type CompanySource, type Job } from "./sources";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; ResumeMatch/1.0)", Accept: "application/json" };

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const short = (s: string | undefined | null) => stripHtml(s ?? "").slice(0, 1200);
const isRemote = (s: string) => /remote|anywhere|worldwide/i.test(s);

export async function fetchBoards(query: string): Promise<Job[]> {
  const q = encodeURIComponent(query);
  const tasks: Promise<Job[]>[] = [
    getJson(`https://remotive.com/api/remote-jobs?search=${q}&limit=60`).then((d) =>
      (d.jobs ?? []).map((j: any) => ({
        id: `remotive-${j.id}`, title: j.title, company: j.company_name,
        location: j.candidate_required_location || "Remote", remote: true, url: j.url,
        description: short(j.description), source: "Remotive",
      })),
    ),
    getJson(`https://www.arbeitnow.com/api/job-board-api`).then((d) =>
      (d.data ?? []).map((j: any) => ({
        id: `arbeitnow-${j.slug}`, title: j.title, company: j.company_name,
        location: j.location || "", remote: !!j.remote, url: j.url,
        description: short(j.description), source: "Arbeitnow",
      })),
    ),
    getJson(`https://remoteok.com/api`).then((d) =>
      (Array.isArray(d) ? d.slice(1) : []).map((j: any) => ({
        id: `remoteok-${j.id}`, title: j.position, company: j.company,
        location: j.location || "Remote", remote: true, url: j.url,
        description: short(j.description), source: "RemoteOK",
      })),
    ),
    getJson(`https://www.themuse.com/api/public/jobs?page=0&descending=true`).then((d) =>
      (d.results ?? []).map((j: any) => {
        const loc = (j.locations ?? []).map((l: any) => l.name).join(", ");
        return {
          id: `muse-${j.id}`, title: j.name, company: j.company?.name ?? "",
          location: loc, remote: isRemote(loc), url: j.refs?.landing_page,
          description: short(j.contents), source: "The Muse",
        };
      }),
    ),
  ];
  return settle(tasks);
}

export async function fetchCompany(c: CompanySource): Promise<Job[]> {
  switch (c.platform) {
    case "greenhouse": {
      const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs`);
      return (d.jobs ?? []).map((j: any) => ({
        id: `gh-${c.slug}-${j.id}`, title: j.title, company: c.name,
        location: j.location?.name ?? "", remote: isRemote(j.location?.name ?? ""),
        url: j.absolute_url, description: "", source: `${c.name} careers`,
      }));
    }
    case "lever": {
      const d = await getJson(`https://api.lever.co/v0/postings/${c.slug}?mode=json`);
      return (Array.isArray(d) ? d : []).map((j: any) => ({
        id: `lv-${j.id}`, title: j.text, company: c.name,
        location: j.categories?.location ?? "", remote: j.workplaceType === "remote" || isRemote(j.categories?.location ?? ""),
        url: j.hostedUrl, description: short(j.descriptionPlain), source: `${c.name} careers`,
      }));
    }
    case "ashby": {
      const d = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${c.slug}`);
      return (d.jobs ?? []).map((j: any) => ({
        id: `ab-${j.id}`, title: j.title, company: c.name, location: j.location ?? "",
        remote: !!j.isRemote, url: j.jobUrl, description: short(j.descriptionPlain), source: `${c.name} careers`,
      }));
    }
    case "workable": {
      const d = await getJson(`https://apply.workable.com/api/v1/widget/accounts/${c.slug}`);
      return (d.jobs ?? []).map((j: any) => ({
        id: `wk-${c.slug}-${j.shortcode}`, title: j.title, company: d.name ?? c.name,
        location: [j.city, j.country].filter(Boolean).join(", "), remote: !!j.telecommuting,
        url: j.url, description: "", source: `${d.name ?? c.name} careers`,
      }));
    }
    case "smartrecruiters": {
      const d = await getJson(`https://api.smartrecruiters.com/v1/companies/${c.slug}/postings?limit=100`);
      return (d.content ?? []).map((j: any) => ({
        id: `sr-${j.id}`, title: j.name, company: j.company?.name ?? c.name,
        location: [j.location?.city, j.location?.country].filter(Boolean).join(", "),
        remote: !!j.location?.remote, url: `https://jobs.smartrecruiters.com/${c.slug}/${j.id}`,
        description: "", source: `${j.company?.name ?? c.name} careers`,
      }));
    }
  }
}

export async function settle(tasks: Promise<Job[]>[]): Promise<Job[]> {
  const out = await Promise.allSettled(tasks);
  return out.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
