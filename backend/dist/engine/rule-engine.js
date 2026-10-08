"use strict";
// ============================================================
// Rule Engine - 10 formatting rules for Phase 1 (PRD §6.4)
// Each rule: id, severity, message, explanation, fix, pointsLost
// Rules are data-driven: config + pure functions
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RULES = void 0;
exports.runRules = runRules;
const RULES = [
    // ─── Rule 1: Multi-column layout ──────────────────────────────
    {
        id: "R001",
        severity: "critical",
        pointsLost: 20,
        check: (p) => ({ triggered: p.isMultiColumn }),
        message: () => "Multi-column layout detected",
        explanation: "Many ATS parsers read resumes left-to-right across the full page width, causing columns to be merged or scrambled. Skills from the right column may appear inline with job titles from the left column, creating nonsense like 'Software Engineer Python JavaScript React'.",
        fix: "Convert to a single-column format. All content should flow top to bottom in one column.",
    },
    // ─── Rule 2: Contact info only in header/footer ───────────────
    {
        id: "R002",
        severity: "critical",
        pointsLost: 15,
        check: (p) => ({ triggered: p.hasHeaderFooterContent }),
        message: () => "Contact info found only in header/footer region",
        explanation: "Most ATS parsers skip PDF headers and footers entirely. If your name, email, or phone are only in the header, the ATS may record you as a nameless candidate.",
        fix: "Move your contact information into the main body of the document. Do not rely on PDF header/footer regions.",
    },
    // ─── Rule 3: Image-only PDF ───────────────────────────────────
    {
        id: "R003",
        severity: "critical",
        pointsLost: 50,
        check: (p) => ({ triggered: p.isImageOnly }),
        message: () => "PDF has no text layer (image-only / scanned)",
        explanation: "This PDF contains only images - there is no machine-readable text. An ATS cannot extract anything from it. This is a critical issue.",
        fix: "Export the resume from a word processor (Word, Google Docs) as a text-based PDF. Do not scan a printed version or save as image-based PDF.",
    },
    // ─── Rule 4: Missing core sections ───────────────────────────
    {
        id: "R004",
        severity: "critical",
        pointsLost: 10,
        check: (p) => {
            const required = ["experience", "education", "skills", "contact"];
            const found = p.sections.map((s) => s.name);
            const missing = required.filter((r) => !found.includes(r));
            return { triggered: missing.length > 0, detail: missing.join(", ") };
        },
        message: (detail) => `Missing core sections: ${detail}`,
        explanation: "ATS parsers look for specific sections to categorize your qualifications. Missing standard sections means the ATS cannot properly categorize your experience, education, or skills.",
        fix: "Add clearly labeled sections for each missing category using standard headings.",
    },
    // ─── Rule 5: Non-standard section headings ────────────────────
    {
        id: "R005",
        severity: "warning",
        pointsLost: 8,
        check: (p) => {
            const nonStandard = p.sections.filter((s) => s.rawHeading &&
                s.rawHeading.toLowerCase() !== s.name &&
                !["experience", "education", "skills", "summary", "contact", "projects", "certifications"].includes(s.name));
            // Only flag if using very non-standard headings
            const veryNonStandard = p.sections.filter((s) => s.name === "unlabeled" || (s.confidence < 0.7 && s.rawHeading));
            return {
                triggered: veryNonStandard.length > 0,
                detail: veryNonStandard.map((s) => `"${s.rawHeading}"`).join(", "),
            };
        },
        message: (detail) => `Non-standard or unrecognized section headings: ${detail}`,
        explanation: "ATS parsers match section headings against a known list. Creative headings like 'My Journey' instead of 'Experience' may not be recognized, causing that content to be miscategorized or ignored.",
        fix: "Use standard section headings: Experience, Education, Skills, Summary, Projects, Certifications.",
    },
    // ─── Rule 6: Inconsistent/unparseable date formats ───────────
    {
        id: "R006",
        severity: "warning",
        pointsLost: 8,
        check: (p) => {
            const text = p.readingOrderText;
            // Look for mixed date formats
            const mmyyyy = (text.match(/\b\d{1,2}\/\d{4}\b/g) || []).length;
            const monyyyy = (text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/gi) || []).length;
            const yyyyonly = (text.match(/\b(20|19)\d{2}\b/g) || []).length;
            const types = [mmyyyy > 0, monyyyy > 0, yyyyonly > 2].filter(Boolean).length;
            return { triggered: types >= 2, detail: `${types} different date formats detected` };
        },
        message: (detail) => `Inconsistent date formats (${detail})`,
        explanation: "ATS systems parse dates to calculate experience duration and recency. Mixed formats (01/2022, Jan 2022, 2022) can confuse parsers and lead to incorrect calculations.",
        fix: "Use one consistent date format throughout. 'Month YYYY' (e.g., Jan 2022) is widely recognized.",
    },
    // ─── Rule 7: Resume too long for apparent seniority ──────────
    {
        id: "R007",
        severity: "info",
        pointsLost: 3,
        check: (p) => {
            // Simple heuristic: more than 2 pages for entry-level signals
            const text = p.readingOrderText.toLowerCase();
            const hasIntern = /intern|student|fresh(er|man|graduate)|entry.?level/.test(text);
            const tooLong = p.pageCount > 2 && hasIntern;
            const veryLong = p.pageCount > 3;
            return {
                triggered: tooLong || veryLong,
                detail: `${p.pageCount} pages`,
            };
        },
        message: (detail) => `Resume length (${detail}) may be too long`,
        explanation: "ATS systems often have page limits or truncate content. Many recruiters expect 1-2 pages for early career, 2-3 for senior roles. Overly long resumes risk truncation.",
        fix: "Trim your resume to 1-2 pages for early career, up to 3 for senior roles. Remove outdated experience (10+ years).",
    },
    // ─── Rule 8: Bullet points too long / no action verb ─────────
    {
        id: "R008",
        severity: "info",
        pointsLost: 5,
        check: (p) => {
            const expSection = p.sections.find((s) => s.name === "experience");
            if (!expSection)
                return { triggered: false };
            const bullets = expSection.text
                .split("\n")
                .filter((l) => l.trim().match(/^[•·▪▸→\-–-*]/));
            const longBullets = bullets.filter((b) => b.length > 200);
            const noActionVerb = bullets.filter((b) => {
                const words = b.replace(/^[•·▪▸→\-–-*\s]+/, "").split(/\s+/);
                if (words.length === 0)
                    return false;
                return !/^[A-Z]/.test(words[0]) || words[0].length < 3;
            });
            const triggered = longBullets.length > 2 || noActionVerb.length > bullets.length * 0.5;
            return {
                triggered,
                detail: longBullets.length > 0 ? `${longBullets.length} overly long bullets` : `${noActionVerb.length} bullets may lack action verbs`,
            };
        },
        message: (detail) => `Bullet point issues: ${detail}`,
        explanation: "ATS keyword extractors parse bullet points to match experience to job requirements. Overly long bullets dilute keyword density. Bullets without action verbs miss structured parsing patterns.",
        fix: "Start each bullet with a strong action verb (Built, Led, Optimized, Reduced). Keep bullets under 150 characters. Include measurable impact where possible.",
    },
    // ─── Rule 9: Missing email or phone ──────────────────────────
    {
        id: "R009",
        severity: "critical",
        pointsLost: 12,
        check: (p) => {
            const noEmail = !p.entities.email.value;
            const noPhone = !p.entities.phone.value;
            return {
                triggered: noEmail || noPhone,
                detail: [noEmail && "email", noPhone && "phone"].filter(Boolean).join(" and "),
            };
        },
        message: (detail) => `Contact information missing: no ${detail} found`,
        explanation: "ATS systems extract contact information to create candidate records. Missing email or phone means recruiters cannot contact you even if your resume matches.",
        fix: "Ensure your email address and phone number are clearly visible in the body of the resume (not only in the PDF header).",
    },
    // ─── Rule 10: Tables used for layout ─────────────────────────
    {
        id: "R010",
        severity: "warning",
        pointsLost: 12,
        check: (p) => {
            // Heuristic: if there are many lost regions with "table_scramble" reason
            const tableRegions = p.lostRegions.filter((r) => r.reason === "table_scramble");
            // Also check warnings
            const tableWarning = p.warnings.some((w) => w.type === "table_layout");
            return { triggered: tableRegions.length > 0 || tableWarning };
        },
        message: () => "Tables detected in layout structure",
        explanation: "While ATS parsers have improved, tables are still a common source of parsing errors. Text in table cells is often merged or read in the wrong order, scrambling your experience entries.",
        fix: "Replace table-based layouts with simple text and spacing. Use plain text with consistent formatting instead of table cells.",
    },
];
exports.RULES = RULES;
/**
 * Run all rules against a parse result and return findings.
 */
function runRules(parseResult) {
    const results = [];
    for (const rule of RULES) {
        const { triggered, detail, page } = rule.check(parseResult);
        if (triggered) {
            results.push({
                id: rule.id,
                severity: rule.severity,
                message: rule.message(detail),
                explanation: rule.explanation,
                fix: rule.fix,
                pointsLost: rule.pointsLost,
                location: page ? { page } : undefined,
            });
        }
    }
    return results;
}
