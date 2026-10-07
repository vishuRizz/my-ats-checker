# PRD: ATS Checker ("See what the ATS actually sees")

> Instructions for the building agent: read this whole document first. Build in the phases listed in section 12, in order. Finish and verify each phase before starting the next. Where this document is ambiguous, choose the simplest option that satisfies the acceptance criteria and note the assumption in `DECISIONS.md`. Never fabricate scores, vendor behavior, or resume content.

---

## 1. Product summary

A web tool where a user uploads a resume (PDF/DOCX), optionally pastes a job description (JD), and gets:

1. A view of **what an ATS parser actually extracted** from the resume, with lost/scrambled content highlighted.
2. A **transparent score breakdown** (not one magic number).
3. A **JD match analysis** (exact keyword match and semantic match, reported separately).
4. **Actionable fixes**, including grounded rewrite suggestions shown as a diff.
5. An **ATS-safe export** and a re-scan to show improvement.

### Positioning and honesty rules (non-negotiable)

- No ATS publishes a universal score. **Never label anything "ATS score" or claim "beats ATS" / "guaranteed pass."** Use the terms "parse analysis," "match analysis," and "estimated."
- Parsing quality is the **gate**; JD match is the **target**. Both are required. The tool must be useful with no JD (no-JD mode).
- The LLM must **never invent experience**. Rewrites must be grounded in content already in the resume; gaps are flagged for the user to fill with real proof.

## 2. Goals and non-goals

**Goals**
- The "What the ATS sees" report (section 6.3) loads fast and is the aha moment.
- Deterministic, explainable scoring: every lost point links to a specific, fixable item.
- Works with no signup for the first scan.
- Privacy-first handling of resumes (PII).

**Non-goals (v1)**
- Not a job board, resume builder from scratch, or application tracker.
- No claim of exact emulation of any vendor. Vendor profiles are "approximate simulations of known quirks."
- No mobile app (responsive web only).

## 3. Target users

- Job seekers (students, early-career, switchers) who want to know why they are not getting callbacks.
- Secondary: career coaches and college placement cells reviewing many resumes.

## 4. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind, pdf.js for the viewer/overlay |
| Backend | Same Next.js app: Route Handlers (and Server Actions where convenient) on the **Node.js runtime, never Edge**. No separate backend service |
| Analysis engine | `/packages/engine`: pure TypeScript, no Next.js imports. Deterministic PDF/DOCX extraction (`pdfjs-dist` text items with coordinates, or `mupdf` WASM), reading-order reconstruction, rule engine, matcher, search simulator |
| Database / Auth / Storage | Supabase (Postgres + pgvector, Auth, Storage) |
| Jobs | Postgres-backed job table for OCR and LLM calls, processed by a worker entrypoint (`/worker`) that reuses `/packages/engine`. Same repo, same Docker image, different start command |
| LLM | Anthropic API, structured JSON output only, used for suggestions, not scoring |
| Embeddings | Any embedding API or local model; stored in pgvector |
| Hosting | One deployable: the Next.js app (standalone output, Docker) on GCP Cloud Run, plus the worker as a second Cloud Run service or job from the same image. Cloud Run is preferred over Vercel serverless because PDF parsing and OCR need more memory and longer timeouts. Vercel is acceptable for early Phase 1 only if heavy work stays small and under its limits |

Monorepo layout suggestion:

```
/apps/web            # Next.js: UI + API route handlers (thin; call the engine)
/packages/engine     # pure TS: extraction, reading order, rules, matcher, search sim, scoring
/packages/shared     # shared TS types / JSON schemas (zod)
/worker              # job runner for OCR / LLM / long parses; imports /packages/engine
/data/taxonomy       # skills taxonomy seed files
/eval                # eval set + runner (see section 11)
DECISIONS.md
```

Contract between UI and backend: zod schemas defined in `/packages/shared`, versioned. Route handlers in `/apps/web/app/api`: `POST /api/parse`, `POST /api/analyze`, `POST /api/search-sim`. Handlers stay thin: validate input, call `/packages/engine`, persist, return. Long-running work (OCR, LLM, large files) is enqueued as a job and the client polls or subscribes for status. The engine sits behind a clean interface (`parse(file) -> ParseResult`, `analyze(parse, jd) -> Analysis`) so any module can be swapped later (for example rewritten in Rust or moved to a Python worker) without touching the UI.

## 5. Core concepts and data model

### 5.1 Entities (Postgres)

- `users` (Supabase auth; anonymous sessions allowed)
- `resumes`: id, user_id/session_id, storage_path, file_type, uploaded_at, delete_at, status
- `parse_results`: id, resume_id, parser_version, reading_order_text, sections (jsonb), entities (jsonb), lost_regions (jsonb: page, bbox, reason), warnings (jsonb)
- `job_descriptions`: id, user_id/session_id, raw_text, source_url (nullable), extracted_requirements (jsonb)
- `analyses`: id, resume_id, jd_id (nullable), score_breakdown (jsonb), keyword_report (jsonb), vendor_reports (jsonb), created_at
- `suggestions`: id, analysis_id, type, target_ref, original_text, suggested_text, status (pending/accepted/rejected), rationale
- `skills`: id, canonical_name, aliases (text[]), category, embedding (vector)
- `scan_versions`: id, resume_id, analysis_id, score_snapshot (for before/after comparison)

### 5.2 Key JSON shapes (abbreviated, finalize in `/packages/shared`)

```json
// parse_results.entities
{
  "name": {"value": "", "confidence": 0.0, "source_bbox": null},
  "email": {}, "phone": {}, "links": [],
  "experience": [{"company": "", "title": "", "start": "", "end": "", "bullets": [], "confidence": 0.0}],
  "education": [], "skills": []
}

// lost_regions
[{"page": 1, "bbox": [x0, y0, x1, y1], "reason": "text_in_header|image_only|table_scramble|column_merge|icon_font|ocr_low_conf"}]
```

## 6. Features and requirements

### 6.1 Ingestion

- Accept PDF and DOCX, max 5 MB (configurable). Reject other types with a clear message.
- For PDFs: extract text **with coordinates** (`pdfjs-dist` text content with transforms, or `mupdf` WASM; pick whichever gives better coordinates and reading order on the eval set and record it in `DECISIONS.md`).
- Detect: image-only PDF (no text layer), missing fonts or broken ligatures, icon fonts replacing words, password-protected files.
- OCR fallback for image-only pages (run async, flag results as "OCR, lower confidence").
- **Acceptance:** a clean single-column PDF, a two-column PDF, a table-based DOCX, and a scanned PDF all complete without crashing and produce a parse result or a clear error.

### 6.2 Parser simulation

- **Reading-order reconstruction** (highest-priority engineering task): handle multi-column, sidebars, tables, text boxes, headers/footers. Output the text in the order a naive ATS would read it, **and** a "best-effort correct order" so the diff between them can be shown.
- Section detection by heading, including non-standard names ("Where I've Worked" → Experience). Use a synonym map.
- Entity extraction: name, email, phone, links, companies, titles, dates (normalize many formats), degrees, skills.
- Per-field confidence score.
- **Acceptance:** on the eval set (section 11), section-detection accuracy ≥ 90% and contact-field extraction ≥ 95% on single-column resumes; results for hard layouts are reported honestly, not hidden.

### 6.3 Parse report: "What the ATS sees" (the aha moment)

- Split view. **Left:** PDF rendered via pdf.js with overlay. Green = parsed cleanly, red = lost/scrambled/low confidence (from `lost_regions`). Hover shows the reason.
- **Right:** extracted text in reading order, with parsed fields (name, contact, sections, dates, skills) shown beside or inline. Unparsed items flagged.
- Clicking a flagged item scrolls both panes to it and shows the fix.
- Must render the first meaningful view within ~5 s for a 2-page resume (show progress states; stream results if possible).

### 6.4 Rule engine (formatting and parseability)

Each rule returns: `id`, `severity` (critical/warning/info), `message`, `location` (page + bbox if applicable), `fix`, `points_lost`.

Rules for v1:
- Multi-column layout detected
- Tables used for layout
- Images/graphics/icons carrying text
- Contact info only in header/footer
- Non-standard section headings
- Inconsistent or unparseable date formats
- Length (pages) out of range for apparent seniority
- File type and embedded fonts issues
- Missing core sections (Experience, Education, Skills, Contact)
- Bullet issues: too long, no action verb, no quantified impact (info-level)

Rules must be data-driven (config + small functions) so new rules are easy to add. Each rule needs a unit test with a positive and negative fixture.

### 6.5 JD matching

- Extract from JD: hard skills, tools, titles, years of experience, degree requirements, and classify **required vs nice-to-have** (cues like "must have," "preferred," "bonus"). Use deterministic extraction against the taxonomy first; LLM may assist classification but output must be validated against a JSON schema.
- Normalize with a skills taxonomy (seed from ESCO / O*NET / Lightcast Open Skills, whichever license permits) so aliases match ("JS" = "JavaScript", "K8s" = "Kubernetes", "RN" = "React Native").
- Two separate reports:
  1. **Exact match** (what a keyword filter would see): matched / missing, with counts.
  2. **Semantic match** (pgvector embeddings): near-matches and related skills, clearly labeled as semantic.
- Per keyword, report placement: **in a bullet with context** (strong), **skills list only** (weak), or **missing**.
- Check seniority/years fit and skill recency (skill only in old roles = flag).
- Weight: required > nice-to-have; repeated JD terms weigh more.
- **Acceptance:** for a hand-checked resume + JD pair, the matched/missing lists are correct, and aliases resolve.

### 6.6 Scoring

Transparent breakdown, each 0-100 with sub-items listed:

1. Parse integrity
2. Keyword coverage (required vs optional), only when a JD is present
3. Experience relevance, only when a JD is present
4. Bullet quality
5. Formatting risks

- Overall number is a labeled **estimate** and is computed deterministically from the breakdown (document the formula in `/docs/scoring.md`). **The LLM never contributes to the score.**
- Every point lost links to a rule or keyword item with a fix.
- No-JD mode: omit JD-dependent categories and renormalize; show "Add a job description for sharper results."

### 6.7 Vendor profiles

- Tabs for Workday, Greenhouse, Lever, Taleo.
- Each profile is a config of **known, documented quirks** (e.g., how it handles tables, columns, headers, date formats) applied on top of the parse result to produce a per-vendor view such as "Passes on Greenhouse, dates lost on Workday."
- Label every vendor view "approximate simulation." Keep each quirk's source/rationale in the config as a comment. If a quirk cannot be justified, do not include it.

### 6.8 Recruiter search simulator

- Input: boolean query, e.g. `("react native" OR expo) AND typescript NOT intern`.
- Parse AND / OR / NOT, quotes, and parentheses. Evaluate against the **parsed text of the resume as the ATS sees it** (not the original), with alias awareness toggle (off by default to mimic strict keyword search).
- Output: surfaced / not surfaced, plus which terms matched or missed and where.
- **Acceptance:** unit tests cover precedence, nesting, quoted phrases, and case-insensitivity.

### 6.9 Multi-JD mode (v3)

- Up to 5 JDs: ranked fit per JD, plus the missing skills shared across all of them.

### 6.10 Fix flow and auto-tailor

- Clicking any issue shows the explanation and the fix.
- **Auto-tailor** (LLM): generates per-bullet rewrite suggestions for a chosen JD, shown as a tracked-changes style diff. User accepts/rejects each line. Only accepted changes enter the exported version.
- LLM constraints: input is the resume's own text + the JD requirements; output is strict JSON (`original`, `suggested`, `rationale`, `grounded_in` pointing to source text, `needs_user_proof` boolean). If a suggestion adds a claim not supported by the source, it must set `needs_user_proof: true` and phrase it as a placeholder prompt (e.g., "Add a real metric here"), never a made-up number or tool.
- Validate the JSON; on failure retry once, then fall back to rule-based tips.

### 6.11 Export and re-scan

- Generate an ATS-safe version: single column, standard headings, standard fonts, consistent dates, no tables/graphics. Output as DOCX and PDF.
- One-click re-scan; show before/after comparison from `scan_versions`.
- Fidelity rule: export must not drop or alter content beyond accepted suggestions and structural cleanup. Show a diff of structural changes.

### 6.12 Browser extension (v3)

- Chrome extension that extracts the JD from LinkedIn, Naukri, and Indeed job pages and opens the tool with the JD prefilled.

## 7. User flow

1. **Landing:** headline "See what the ATS actually sees," drop zone, no signup for the first scan.
2. **Upload:** PDF/DOCX plus optional JD (paste or link). JD field is prominent with the nudge "Results are much sharper with a job description." Progress bar during parse.
3. **Parse report** (6.3).
4. **Score breakdown** (6.6).
5. **JD match** (6.5), if a JD was added.
6. **Vendor view** (6.7).
7. **Recruiter search simulator** (6.8).
8. **Fix it** (6.10).
9. **Export and re-scan** (6.11).
10. **Retention:** prompt to sign up to save scans, track versions, compare multiple JDs. Auto-delete controls visible throughout.

## 8. Non-functional requirements

- **Performance:** parse report first view ≤ 5 s for a 2-page text PDF; OCR and LLM work runs async with visible progress.
- **Determinism:** same file + same JD + same versions = same score. Pin parser, taxonomy, and rules versions on every analysis.
- **Accessibility:** keyboard navigable, color-blind-safe overlay (do not rely on red/green alone; add patterns or icons), WCAG AA contrast.
- **Responsive:** usable on mobile; the split view becomes tabs.
- **Observability:** structured logs, error tracking, and per-stage timing (upload, extract, parse, analyze, LLM).

## 9. Privacy and security

Resumes contain PII. Treat this as a launch blocker, not a later task.

- Encrypt at rest and in transit. Private storage buckets; signed URLs, short expiry.
- **Auto-delete:** anonymous uploads deleted within 24 h by default; signed-in users can set retention and delete everything with one click. Enforce with a scheduled job and test it.
- Row-level security on every table; users can only read their own rows.
- Do not log resume text or JD text. Redact PII in error reports.
- Clear public policy: resumes are not used to train models. Use LLM providers/settings that do not train on API data.
- Rate limits and file validation (type, size, magic bytes); parse in the worker (a separate process or worker thread) with hard timeouts, memory limits, and page-count limits to avoid malicious-file abuse. Never parse inside the request path for large or suspicious files.
- Prompt-injection defense: resume and JD text are untrusted. Delimit them in prompts, instruct the model to treat them as data, validate structured output, and never let model output trigger actions.

## 10. Analytics (privacy-safe)

Track aggregate events only: upload started/completed, JD added (yes/no), report sections viewed, suggestions accepted/rejected, export, re-scan, signup. No resume content in analytics.

Key metrics: upload-to-report completion rate, JD attach rate, suggestion acceptance rate, re-scan rate, average score delta after fixes, signup conversion.

## 11. Evaluation (build this early, phase 1)

- Create `/eval` with 50-100 varied resumes (single-column, two-column, tables, designer templates, DOCX, scanned) and hand-labeled ground truth for sections, contact fields, dates, and skills. Use synthetic or consented resumes only.
- A runner script reports per-field accuracy and a regression diff against the last run. CI fails if accuracy drops more than a set threshold.
- Also maintain 20 resume + JD pairs with hand-labeled matched/missing keywords for the matching engine.

## 12. Phased delivery

**Phase 1: MVP (weekend scope)**
- Upload PDF, extract text with coordinates, basic reading order, section detection.
- Show extracted text and sections (split view without heatmap is fine).
- 10 formatting rules from 6.4.
- Exact keyword match against a pasted JD with a tiny alias list.
- Eval set scaffolding and runner.
- **Done when:** upload → report → rule findings → exact match works end to end on 5 test resumes.

**Phase 2**
- DOCX support, OCR fallback, skills taxonomy, semantic matching, placement analysis.
- Full score breakdown and no-JD mode.
- PDF heatmap overlay with `lost_regions`.
- Supabase auth, saved scans, auto-delete job.

**Phase 3**
- Vendor profiles, recruiter search simulator, auto-tailor with diff, ATS-safe export and re-scan, multi-JD mode, browser extension.

## 13. Out of scope for now / open questions

- Payments and pricing tiers (decide after Phase 2 usage data).
- Which taxonomy license to use (check ESCO / O*NET / Lightcast terms before shipping).
- Additional vendor profiles (iCIMS, SuccessFactors, Ashby).
- Performance escape hatch: if profiling shows extraction or reading-order work is a bottleneck, or reading-order quality is poor, rewrite only that engine module (Rust, or Python with PyMuPDF) behind the existing interface. Do not do this before the eval set shows a real problem.
- Multi-language resumes.

## 14. Definition of done (every phase)

- Acceptance criteria for included features pass.
- Unit tests for the rule engine, matcher, and search-simulator parser; eval runner shows no regression.
- No `any`-typed escape hatches in shared contracts; schemas validated at service boundaries.
- Privacy checklist in section 9 verified for anything touching user data.
- `DECISIONS.md` updated with assumptions and trade-offs.
