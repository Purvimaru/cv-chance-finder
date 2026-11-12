import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { matchJobs, type MatchResponse, type MatchResult } from "@/lib/match.functions";
import { extractResumeText } from "@/lib/resume-text";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resume Match — find jobs that fit your CV" },
      { name: "description", content: "Upload your resume. AI checks job boards and company career pages and scores your chance of getting hired for each opening." },
      { property: "og:title", content: "Resume Match — find jobs that fit your CV" },
      { property: "og:description", content: "AI-scored job matches from job boards and company career pages, based on your resume." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const LEVELS = [
  { v: "", l: "Any level" },
  { v: "entry", l: "Entry / Junior" },
  { v: "mid", l: "Mid level" },
  { v: "senior", l: "Senior / Lead" },
] as const;

function Index() {
  const run = useServerFn(matchJobs);
  const fileRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState("");
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [level, setLevel] = useState<"" | "entry" | "mid" | "senior">("");
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [readErr, setReadErr] = useState("");
  const [res, setRes] = useState<MatchResponse | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setReadErr("");
    setFileName(f.name);
    try {
      const t = await extractResumeText(f);
      if (t.trim().length < 80) setReadErr("We couldn't read much text from that file. Try another file or paste your resume.");
      setResume(t);
    } catch {
      setReadErr("We couldn't read that file. Try a PDF or Word (.docx) file, or paste the text.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (resume.trim().length < 80) return setReadErr("Please upload or paste your resume first.");
    setLoading(true);
    setRes(null);
    try {
      const careerUrls = urls.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
      setRes(await run({ data: { resume, title, location, remoteOnly, level, careerUrls } }));
    } catch {
      setRes({ ok: false, error: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl font-extrabold tracking-tight">Resume<span className="text-primary">Match</span></span>
        <span className="text-sm text-muted-foreground">No sign-up needed</span>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="py-10 md:py-16">
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Drop your resume. <span className="text-primary">See where you'd actually get hired.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            We check public job boards and the career pages of 45+ companies, then AI scores your chance for every opening.
          </p>
        </section>

        <form onSubmit={submit} className="grid gap-6 rounded-3xl border bg-card p-6 shadow-sm md:grid-cols-[1.1fr_1fr] md:p-8">
          <div className="space-y-3">
            <label className="text-sm font-semibold">Your resume</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
              className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-accent/40 px-4 py-8 text-center transition hover:bg-accent"
            >
              <span className="font-display text-lg font-bold">{fileName || "Upload PDF or Word file"}</span>
              <span className="mt-1 text-sm text-muted-foreground">{fileName ? "Click to change" : "Click or drag & drop"}</span>
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="…or paste your resume text here"
              className="h-40 w-full resize-none rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {readErr && <p className="text-sm text-destructive">{readErr}</p>}
          </div>

          <div className="space-y-4">
            <Field label="Job title" hint="Leave empty and AI will pick from your resume">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frontend Engineer" className="input" />
            </Field>
            <Field label="Location">
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bangalore, London" className="input" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="size-4 accent-primary" />
              Remote jobs only
            </label>
            <Field label="Experience level">
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((x) => (
                  <button key={x.v} type="button" onClick={() => setLevel(x.v)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${level === x.v ? "border-ink bg-ink text-ink-foreground" : "bg-background hover:bg-muted"}`}>
                    {x.l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Add company career pages (optional)" hint="Greenhouse, Lever, Ashby, Workable or SmartRecruiters links, up to 5">
              <textarea value={urls} onChange={(e) => setUrls(e.target.value)} placeholder="https://jobs.lever.co/company" className="input h-16 resize-none" />
            </Field>
            <button disabled={loading} className="w-full rounded-xl bg-primary px-5 py-3.5 font-display text-lg font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
              {loading ? "Searching & scoring…" : "Find my matches"}
            </button>
          </div>
        </form>

        {loading && <p className="mt-10 animate-pulse text-center text-muted-foreground">Reading your resume, checking career pages and scoring jobs — this takes about a minute.</p>}
        {res && !res.ok && <p className="mt-10 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">{res.error}</p>}
        {res && res.ok && <Results data={res} />}
      </main>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold">{label}</div>
      {children}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Results({ data }: { data: Extract<MatchResponse, { ok: true }> }) {
  return (
    <section className="mt-14">
      <div className="rounded-2xl bg-ink p-6 text-ink-foreground">
        <div className="text-sm opacity-70">Your profile</div>
        <div className="mt-1 font-display text-2xl font-bold">{data.profile.headline}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.profile.skills.slice(0, 18).map((s) => (
            <span key={s} className="rounded-full bg-ink-foreground/10 px-2.5 py-1 text-xs">{s}</span>
          ))}
        </div>
        <div className="mt-4 text-sm opacity-70">
          Searched “{data.searchedTitle}” across {data.sourcesChecked} sources · {data.jobsFound.toLocaleString()} openings checked · {data.matches.length} best matches scored
        </div>
      </div>

      {data.matches.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">No openings matched those filters. Try a broader job title or remove the location.</p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {data.matches.map((m) => <JobCard key={m.id} m={m} />)}
        </div>
      )}
      <p className="mt-8 text-center text-xs text-muted-foreground">Scores are AI estimates to guide you, not a guarantee of being hired.</p>
    </section>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "var(--success)" : score >= 45 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="grid size-16 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, var(--muted) 0)` }}>
      <div className="grid size-12 place-items-center rounded-full bg-card font-display text-lg font-extrabold">{score}%</div>
    </div>
  );
}

function JobCard({ m }: { m: MatchResult }) {
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5">
      <div className="flex gap-4">
        <ScoreRing score={m.score} />
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold leading-tight">{m.title}</h3>
          <div className="text-sm text-muted-foreground">{m.company} · {m.location || "Location not listed"}{m.remote && " · Remote"}</div>
          <div className="mt-1 text-xs text-muted-foreground">via {m.source}</div>
        </div>
      </div>
      {m.matchedSkills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {m.matchedSkills.map((s) => <span key={s} className="rounded-full bg-success/15 px-2 py-0.5 text-xs">✓ {s}</span>)}
        </div>
      )}
      {m.missingSkills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.missingSkills.map((s) => <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">✗ {s}</span>)}
        </div>
      )}
      <p className="mt-3 text-sm"><span className="font-semibold">Tip:</span> {m.tip}</p>
      <a href={m.url} target="_blank" rel="noreferrer" className="mt-4 self-start rounded-lg border border-ink px-4 py-2 text-sm font-semibold transition hover:bg-ink hover:text-ink-foreground">
        View & apply →
      </a>
    </article>
  );
}
