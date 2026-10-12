# Evaluation dataset

This directory is the quality gate for the parsing and matching engine. Fixtures must be synthetic or provided with documented permission; never add a real applicant's resume or job description without explicit consent.

## Adding a resume fixture

1. Place the PDF or DOCX in `fixtures/`.
2. Add its labels to `ground-truth.json`: sections, contact fields, expected skills, page count, whether it is multi-column, and `fixtureTypes`.
3. For matching evaluation, add a JD in `fixtures/jds/` and labelled matched/missing keyword expectations.
4. Run `npm run eval:report` from this folder.

The supported `fixtureTypes` are `single_column`, `multi_column`, `table_docx`, `scanned`, and `designer_layout`. A resume can have more than one type.

## Dataset targets

The curated set must cover at least 50 resumes and 20 resume/JD pairs, including single-column, multi-column/sidebar, table-based DOCX, scanned/image-only, and difficult designer layouts. The targets and allowable regression are recorded in `quality-gates.json`.

The current small fixture set is a smoke suite, not a release-quality dataset. `npm run quality-gate` intentionally fails until the coverage targets are met; regular CI runs the smoke suite only.

## Privacy

- Use fictional names, emails, phone numbers, companies, and links in synthetic data.
- Do not commit unredacted PII, applicant content, or proprietary job descriptions.
- Generated reports live in `reports/` and are ignored by git.
