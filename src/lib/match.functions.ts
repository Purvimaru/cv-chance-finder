import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_COMPANIES, parseCareerUrl, type Job } from "./jobs/sources";
import { prefilter } from "./jobs/rank";

const inputSchema = z.object({
  resume: z.string().min(80).max(30000),
  title: z.string().max(100),
  location: z.string().max(100),
  remoteOnly: z.boolean(),
  level: z.enum(["", "entry", "mid", "senior"]),
  careerUrls: z.array(z.string().max(300)).max(5),
});

const profileSchema = z.object({
  name: z.string().nullable(),
  headline: z.string(),
  suggestedTitle: z.string(),
  yearsExperience: z.number(),
  skills: z.array(z.string()),
});

const scoreSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      score: z.number(),
      matchedSkills: z.array(z.string()),
      missingSkills: z.array(z.string()),
      tip: z.string(),
    }),
  ),
});

export type MatchResult = Job & { score: number; matchedSkills: string[]; missingSkills: string[]; tip: string };
export type MatchResponse =
  | { ok: true; profile: z.infer<typeof profileSchema>; searchedTitle: string; sourcesChecked: number; jobsFound: number; matches: MatchResult[] }
  | { ok: false; error: string };

export const matchJobs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<MatchResponse> => {
    const { structured, AiError } = await import("./ai.server");
    const { fetchBoards, fetchCompany, settle } = await import("./jobs/fetchers.server");
    try {
      const resume = data.resume.slice(0, 15000);
      const profile = await structured(
        profileSchema,
        "You extract a candidate profile from a resume. List up to 25 concrete skills (tools, languages, domains). suggestedTitle is the single best job title to search for (2-3 words). yearsExperience is total professional years (number). name is null if absent.",
        resume,
      );
      const searchedTitle = data.title.trim() || profile.suggestedTitle;
      const extra = data.careerUrls.map(parseCareerUrl).filter((c): c is NonNullable<typeof c> => !!c);
      const companies = [...extra, ...DEFAULT_COMPANIES];
      const all = await settle([fetchBoards(searchedTitle), ...companies.map((c) => fetchCompany(c))]);
      const picked = prefilter(all, { ...data, title: searchedTitle }, profile.skills, 25);
      if (!picked.length) {
        return { ok: true, profile, searchedTitle, sourcesChecked: companies.length + 4, jobsFound: all.length, matches: [] };
      }
      const jobsText = picked
        .map((j) => `ID: ${j.id}\nTitle: ${j.title}\nCompany: ${j.company}\nLocation: ${j.location}${j.remote ? " (remote)" : ""}\nDescription: ${j.description.slice(0, 700) || "(not provided; infer typical requirements from the title)"}`)
        .join("\n---\n");
      const scored = await structured(
        scoreSchema,
        `You are an experienced recruiter. For every job, estimate the realistic chance (0-100) that this candidate gets shortlisted/hired, based on skill fit, seniority fit and experience${data.level ? ` (candidate targets ${data.level} level)` : ""}. Be honest; most scores should fall between 20 and 85. Give up to 6 matchedSkills, up to 5 missingSkills, and one concrete tip under 25 words. Return one result per job ID.`,
        `CANDIDATE (${profile.yearsExperience} yrs): ${profile.headline}\nSkills: ${profile.skills.join(", ")}\n\nRESUME:\n${resume.slice(0, 6000)}\n\nJOBS:\n${jobsText}`,
      );
      const byId = new Map(scored.results.map((r) => [r.id, r]));
      const matches = picked
        .map((j) => {
          const r = byId.get(j.id);
          return r ? { ...j, score: Math.max(0, Math.min(100, Math.round(r.score))), matchedSkills: r.matchedSkills.slice(0, 6), missingSkills: r.missingSkills.slice(0, 5), tip: r.tip } : null;
        })
        .filter((m): m is MatchResult => !!m)
        .sort((a, b) => b.score - a.score);
      return { ok: true, profile, searchedTitle, sourcesChecked: companies.length + 4, jobsFound: all.length, matches };
    } catch (e) {
      if (e instanceof AiError) return { ok: false, error: e.message };
      console.error(e);
      return { ok: false, error: "Something went wrong while matching. Please try again." };
    }
  });
