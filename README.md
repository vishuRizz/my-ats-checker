# ATS Checker — *See what the ATS actually sees*

Most resume tools hand you a magic "ATS score" and hope you believe it. **ATS Checker** shows you the thing that really matters: **what an applicant tracking system extracts from your resume**, what it loses or scrambles, and how well you match a specific job description. Every lost point links to a concrete, fixable item.

> **Honesty rule:** no ATS publishes a universal score, so this project never claims to "beat the ATS" or "guarantee a pass." It reports *parse analysis* and *estimated match analysis*, and vendor profiles are approximations of known quirks, not exact emulations.

---

## What it does

| Feature | Description |
|---|---|
| **Parse report ("what the ATS sees")** | Extracts text from PDF/DOCX with coordinates, rebuilds reading order, detects sections and entities, and flags lost or garbled regions (multi-column layouts, tables, text boxes, icons). |
| **PDF heatmap** | Overlays the original PDF to show exactly where the parser lost content. |
| **Transparent score breakdown** | Deterministic, rule-based scoring split into categories, not one opaque number. |
| **JD match** | Exact keyword matching and semantic (embedding) matching reported *separately*, with matched / missing skills and a skill-gap view. |
| **ATS vendor profiles** | Approximate quirks for Greenhouse, Lever, Workday, Ashby, Taleo and iCIMS. |
| **Grounded AI rewrites** | Bullet rewrites and cover letter / LinkedIn summary generation via Groq. The model may only reword what is already in your resume, and gaps are flagged for you to fill with real proof. |
| **Recruiter search simulator** | Test boolean search strings against your parsed resume to see if a recruiter would find you. |
| **LinkedIn profile audit** | Scan a LinkedIn profile for discoverability issues. |
| **Version compare** | Re-scan after fixes and compare before/after. |
| **Browser extension** | A Manifest V3 Chrome sidecar that scores job postings on LinkedIn, Indeed, Greenhouse, Lever, Ashby and Workday as you browse, with keyword X-ray highlighting, 1-click resume tailoring and a job application tracker. |
| **Application tracker** | Save jobs from the extension and move them through Wishlist → Applied → Interviewing → Offer → Rejected on the `/profile` dashboard. |
| **Export** | Download reports and ATS-safe output (PDF/DOCX). |

The first scan works with **no signup**. Sign-in (Clerk) unlocks scan history, the tracker and extension sync.

---

## Architecture

```
┌────────────────────┐      ┌──────────────────────────┐      ┌─────────────────┐
│  Next.js frontend  │ ───▶ │  Fastify API (backend/)  │ ───▶ │ Neon Postgres   │
│  (Vercel)          │      │  (Railway)               │      │ (Drizzle ORM)   │
│  Clerk auth        │      │                          │      └─────────────────┘
└────────────────────┘      │  engine/  parse + score  │      ┌─────────────────┐
┌────────────────────┐      │  llm/     Groq + embeds  │ ───▶ │ Groq LLM API    │
│ Chrome extension   │ ───▶ │                          │      └─────────────────┘
│ (MV3 sidecar)      │      └──────────────────────────┘
└────────────────────┘
```

```
ats-checker/
├── frontend/     Next.js 16 (App Router), React 19, Tailwind 4, Clerk, Radix UI, Recharts
├── backend/      Fastify API, Drizzle ORM, deterministic analysis engine, LLM helpers
│   └── src/
│       ├── engine/   PDF/DOCX extraction, reading order, section detection,
│       │             rule engine, keyword matcher, scorer, vendor profiles,
│       │             recruiter-search + LinkedIn scanners
│       ├── llm/      Groq client (key rotation), bullet rewriter,
│       │             application kit, local embeddings (@xenova/transformers)
│       └── db/       Drizzle schema + client
├── extension/    Manifest V3 Chrome extension (background, content scripts, popup)
├── eval/         Fixture resumes, ground-truth labels, eval runner + quality gates
├── test/         Sample resume + JD for manual testing
├── DECISIONS.md  Architectural decisions and trade-offs
└── PRD-ats-checker.md  Full product spec
```

**Design principle:** parsing and scoring are **deterministic and explainable**. The LLM is used only for suggestions and generation, never for scoring.

### API (Fastify)

| Route | Purpose |
|---|---|
| `GET /health` | Health check |
| `POST /api/analyze` | Upload a resume (+ optional JD) → parse + match analysis |
| `POST /api/suggest` | Grounded bullet rewrite suggestions |
| `POST /api/generate-kit` | Cover letter / LinkedIn summary |
| `POST /api/simulator/boolean-search` | Recruiter search simulator |
| `GET /api/linkedin/demos`, `POST /api/linkedin/scan` | LinkedIn profile audit |
| `GET /api/user/scans`, `GET/DELETE /api/scans/:id` | Scan history |
| `GET /api/extension/sync`, `POST /api/extension/match`, `POST /api/extension/quick-tailor` | Extension endpoints |
| `POST /api/extension/save-job`, `GET/PATCH/DELETE /api/user/saved-jobs` | Application tracker |

Anonymous endpoints are rate limited per IP.

---

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Clerk, Radix UI, Framer Motion, Recharts, pdf.js
- **Backend:** Node.js 20, Fastify, Zod, Drizzle ORM, `pdfjs-dist`, `mammoth`
- **Data:** Neon (serverless PostgreSQL)
- **AI:** Groq (LLM, round-robin across multiple keys), `@xenova/transformers` (local embeddings)
- **Extension:** Chrome Manifest V3, Shadow DOM UI

---

## Getting started

### Prerequisites
- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- One or more [Groq](https://console.groq.com) API keys
- A [Clerk](https://clerk.com) application (for auth)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # fill in DATABASE_URL and GROQ_KEY_* values
npm run db:push           # create tables
npm run dev               # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:3001 and add your Clerk keys
npm run dev                  # http://localhost:3000
```

### 3. Chrome extension

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the `extension/` folder.
3. Sign in on the web app; the extension pairs automatically. Details in [`extension/README.md`](extension/README.md).

### Environment variables

Never commit real values. Only the `.env.example` templates are tracked.

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Neon Postgres connection string |
| `GROQ_KEY_1…4` | backend | Groq API keys (rotated round-robin) |
| `CORS_ORIGIN` | backend | Allowed frontend origin in production |
| `PORT`, `HOST`, `NODE_ENV`, `LOG_LEVEL` | backend | Server config |
| `ANALYZE_LIMIT_PER_HOUR`, `SUGGEST_LIMIT_PER_HOUR`, `KIT_LIMIT_PER_HOUR` | backend | Per-IP rate limits |
| `NEXT_PUBLIC_API_URL` | frontend | Backend base URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | frontend | Clerk auth (standard Clerk variable names) |

---

## Testing and quality

```bash
cd backend && npm test          # rule-engine unit tests
cd eval && npm run run-eval     # smoke eval against fixture resumes
cd eval && npm run quality-gate # full gate (fails until the curated dataset hits its coverage targets)
```

CI (`.github/workflows/quality.yml`) builds the backend and runs the tests and smoke eval on every PR and push to `main`. Fixtures in `eval/` are synthetic. See [`eval/README.md`](eval/README.md) for the dataset and privacy rules.

---

## Privacy

Resumes are PII. The project aims for privacy-first handling: first scan without an account, bounded uploads (5 MB), and no real applicant data in the eval set. See the in-app Privacy and Security pages.

## Documentation

- [`PRD-ats-checker.md`](PRD-ats-checker.md): product spec and phases
- [`DECISIONS.md`](DECISIONS.md): architecture decisions and trade-offs
- [`extension/README.md`](extension/README.md): extension features and install
- [`eval/README.md`](eval/README.md): evaluation dataset and quality gates

## Contributing

Issues and PRs are welcome. Please run the backend tests and the eval smoke suite before opening a PR, and never commit secrets or real resumes.
