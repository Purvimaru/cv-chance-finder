# AI Resume Job Matcher

Upload a resume, pick filters, and get matching job openings from free job boards and company career websites, each with an AI "chance of getting hired" score and reasons.

## User flow
1. Landing page: upload resume (PDF or DOCX, or paste text). No sign-in.
2. Filters: job title, location / remote, experience level.
3. AI reads the resume and extracts skills, years of experience, roles.
4. App pulls openings from job boards and company career sites matching the title/location.
5. AI scores each job against the resume and returns:
   - Match % (chance of being shortlisted)
   - Matching skills, missing skills
   - Short tip to improve chances
6. Results sorted by score, with an "Apply" link to the original posting.

## Job sources (free, no keys)
- Job boards: Remotive, Arbeitnow, RemoteOK, The Muse.
- Company career websites, via the public job feeds behind their career pages:
  - Greenhouse (e.g. Airbnb, Stripe, Figma)
  - Lever
  - Ashby (many startups)
  - Workable and SmartRecruiters
  A built-in list of ~150 well-known companies is searched; users can also paste a company career page link to include it.
- LinkedIn, Indeed, Naukri block access, so they are not included.
- Optional later upgrade: AI web search across any company's career site (needs a paid search connector).

Results are combined and de-duplicated.

## Design
Clean "career dashboard" look: warm off-white background, deep ink text, one bold accent color, distinctive headline font, score shown as a ring on each job card.

## Technical details
- Resume text extracted in the browser (pdfjs / mammoth), sent as text.
- `fetchJobs` server function: calls boards plus Greenhouse/Lever/Ashby/Workable/SmartRecruiters public APIs per company slug, in parallel with per-source timeouts; filters and caps ~40 jobs. Pasted career URLs are parsed to detect the platform and slug.
- `scoreJobs` server function: Lovable AI (default model), strict JSON schema output, batched, streamed; clear messages for 402/429.
- No database; results kept in page state. Score shown with an "AI estimate" disclaimer.
