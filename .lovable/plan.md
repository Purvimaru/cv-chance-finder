# AI Resume Job Matcher

Upload a resume, pick filters, and get matching job openings from free public job boards, each with an AI "chance of getting hired" score and reasons.

## User flow
1. Landing page: upload resume (PDF or DOCX, or paste text). No sign-in.
2. Filters: job title, location / remote, experience level.
3. AI reads the resume and extracts skills, years of experience, roles.
4. App pulls openings from free public job boards matching the title/location.
5. AI scores each job against the resume and returns:
   - Match % (chance of being shortlisted)
   - Matching skills, missing skills
   - Short tip to improve chances
6. Results list sorted by score, with filters, and "Apply" link to the original posting.

## Job sources (free, no keys)
- Remotive (remote jobs)
- Arbeitnow (Europe + remote)
- RemoteOK
- The Muse
Results are combined and de-duplicated. Coverage is limited to what these boards list (big sites like LinkedIn/Indeed/Naukri block access).

## Design
Clean, confident "career dashboard" look: warm off-white background, deep ink text, one bold accent color, distinctive headline font, score shown as a ring per job card.

## Technical details
- Server functions: `parseResume` (text from PDF/DOCX in browser via pdfjs/mammoth, sent as text), `fetchJobs` (calls the boards, filters, caps ~40 jobs), `scoreJobs` (Lovable AI, structured JSON output, batched).
- AI via Lovable AI Gateway (default model), streaming per guidelines; handle 402/429 with clear messages.
- No database needed; results kept in page state only.
- Note: the score is an AI estimate, shown with a disclaimer.
