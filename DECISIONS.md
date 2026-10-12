# DECISIONS.md

This file tracks architectural decisions, trade-offs, and assumptions made during development.
See PRD §3 instruction: _"Where this document is ambiguous, choose the simplest option that satisfies the acceptance criteria and note the assumption here."_

---

## Architecture

### [ARCH-001] Two-repo split vs monorepo
**Decision:** Use a single repository with two top-level folders: `/frontend` (Next.js) and `/backend` (Fastify Node.js).  
**Rationale:** User requested simple 2-folder structure. Avoids monorepo tooling complexity for Phase 1.  
**Trade-off:** Shared types must be duplicated or kept in a `shared/` folder at the root level.

### [ARCH-002] Backend hosting: Fastify on Railway instead of Next.js Route Handlers
**Decision:** Separate Fastify backend deployed on Railway; Next.js frontend on Vercel.  
**Rationale:** User preference. Avoids Vercel serverless limitations for large file parsing and long-running tasks.  
**Trade-off:** CORS must be configured; frontend must know the API base URL via environment variable.

### [ARCH-003] Database: Neon (serverless Postgres) instead of Supabase
**Decision:** Use Neon for Postgres database.  
**Rationale:** User preference. Same Postgres interface; pgvector available as extension.  
**Phase 1 simplification:** No DB persistence in Phase 1 (stateless responses only).

### [ARCH-004] LLM: Groq API with round-robin key rotation instead of Anthropic
**Decision:** Use Groq API with multiple API keys rotated in round-robin.  
**Rationale:** User has multiple Groq API keys. Groq provides fast inference with OpenAI-compatible interface.  
**Note:** LLM features are Phase 3; Phase 1 does not use the LLM at all.

---

## PDF Extraction

### [PDF-001] PDF library: pdfjs-dist
**Decision:** Use `pdfjs-dist` for PDF text extraction with coordinates.  
**Rationale:** Best pure-JS option for Phase 1. Provides text items with transform matrices.  
**Revisit trigger:** If section-detection accuracy < 90% on eval set, consider mupdf WASM.

---

## Phase 1 Simplifications

### [P1-001] No auth / no session persistence
**Decision:** Phase 1 is fully stateless. No database writes. Results returned in API response only.

### [P1-002] Heatmap overlay deferred
**Decision:** Phase 1 shows extracted text and sections without PDF heatmap overlay. PRD §12 allows "split view without heatmap is fine."

### [P1-003] Alias list for keyword match is small/hardcoded
**Decision:** Phase 1 uses a small hardcoded alias list (~50 common mappings). Full taxonomy is Phase 2.

---

## Phase 0 quality baseline

### [Q-001] Fixture evaluation is the source of quality truth
**Decision:** Keep evaluation labels with fixtures in `/eval`, generate a machine-readable local report, and delay CI release gates until the curated dataset reaches the coverage targets in `eval/quality-gates.json`.
**Rationale:** The current five-fixture set is a smoke suite and cannot credibly establish industry-grade parsing accuracy.
**Trade-off:** We intentionally do not claim release-level accuracy until the supplied synthetic resume/JD dataset is labelled and added.

### [Q-002] Parse only verified, bounded documents
**Decision:** The engine verifies PDF or DOCX signatures instead of trusting MIME type or filename, limits uploads to 5 MB and PDFs to 10 pages, and limits parsed DOCX text to 200,000 characters.
**Rationale:** Resume parsing handles untrusted files. These bounds keep resource use predictable and return clear client errors for invalid uploads.
**Trade-off:** Some unusually long CVs are rejected; they can be supported later with asynchronous worker processing and explicitly higher limits.

### [Q-003] Logs contain operational metadata, never resume or JD content
**Decision:** Analysis and suggestion logs use event names, request IDs, timing, counts, and non-content file metadata. Error logs are sanitized; internal error details are not returned to clients.
**Rationale:** Resumes and JDs are PII-bearing untrusted input. Observability must not become an alternate data store.
**Trade-off:** Debugging extraction failures requires reproducing them with consented fixtures rather than inspecting production content.

### [P1-004] Bound job-description inputs at every boundary
**Decision:** Job descriptions are limited to 20,000 characters in the upload UI, analysis endpoint, and suggestion endpoint.
**Rationale:** The deterministic matcher and LLM prompt only need a single job description; a shared bound prevents inconsistent client/server behavior and oversized prompt inputs.
**Trade-off:** Users must trim unusually long listings before analysis.
