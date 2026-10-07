"use strict";
// ============================================================
// Score Calculator
// PRD §6.6: Transparent breakdown, deterministic, formula in /docs/scoring.md
// LLM NEVER contributes to the score.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeScore = computeScore;
/**
 * Compute a deterministic score breakdown from parse result + rules + keyword report.
 *
 * Formula (documented in /docs/scoring.md):
 * - No JD: parseIntegrity (40%), bulletQuality (30%), formattingRisks (30%)
 * - With JD: parseIntegrity (25%), bulletQuality (15%), formattingRisks (15%),
 *            keywordCoverage (30%), experienceRelevance (15%)
 */
function computeScore(parseResult, rules, keywordReport) {
    const hasJD = keywordReport !== null;
    // ─── Parse Integrity Score ───────────────────────────────────
    const parseIntegrityItems = [];
    let parseDeductions = 0;
    if (parseResult.isImageOnly) {
        parseDeductions += 50;
        parseIntegrityItems.push({ description: "Image-only PDF, no text layer", pointsLost: 50, severity: "critical", fix: "Export from word processor as text PDF" });
    }
    if (parseResult.isMultiColumn) {
        parseDeductions += 15;
        parseIntegrityItems.push({ description: "Multi-column layout causes reading order issues", pointsLost: 15, severity: "critical", fix: "Switch to single-column format" });
    }
    if (parseResult.hasHeaderFooterContent) {
        parseDeductions += 10;
        parseIntegrityItems.push({ description: "Contact info in header/footer (likely skipped by ATS)", pointsLost: 10, severity: "critical", fix: "Move contact info to main body" });
    }
    if (parseResult.lostRegions.length > 0) {
        const regionDeduction = Math.min(15, parseResult.lostRegions.length * 3);
        parseDeductions += regionDeduction;
        parseIntegrityItems.push({ description: `${parseResult.lostRegions.length} content regions may not parse correctly`, pointsLost: regionDeduction, severity: "warning", fix: "Simplify layout to improve parse accuracy" });
    }
    if (!parseResult.entities.email.value) {
        parseDeductions += 10;
        parseIntegrityItems.push({ description: "No email address found", pointsLost: 10, severity: "critical", fix: "Add email to resume body" });
    }
    const parseIntegrity = {
        name: "Parse Integrity",
        score: Math.max(0, 100 - parseDeductions),
        weight: hasJD ? 0.25 : 0.40,
        items: parseIntegrityItems,
    };
    // ─── Formatting Risks Score ──────────────────────────────────
    const formattingItems = [];
    let formatDeductions = 0;
    const formatRules = rules.filter((r) => ["R001", "R002", "R003", "R006", "R007", "R010"].includes(r.id));
    for (const rule of formatRules) {
        formattingItems.push({
            description: rule.message,
            pointsLost: rule.pointsLost,
            severity: rule.severity,
            fix: rule.fix,
        });
        formatDeductions += rule.pointsLost;
    }
    const formattingRisks = {
        name: "Formatting Risks",
        score: Math.max(0, 100 - formatDeductions),
        weight: hasJD ? 0.15 : 0.30,
        items: formattingItems,
    };
    // ─── Bullet Quality Score ─────────────────────────────────────
    const bulletItems = [];
    let bulletDeductions = 0;
    const bulletRule = rules.find((r) => r.id === "R008");
    if (bulletRule) {
        bulletItems.push({
            description: bulletRule.message,
            pointsLost: bulletRule.pointsLost,
            severity: bulletRule.severity,
            fix: bulletRule.fix,
        });
        bulletDeductions += bulletRule.pointsLost;
    }
    // Check for missing sections
    const missingRule = rules.find((r) => r.id === "R004");
    if (missingRule) {
        bulletItems.push({
            description: missingRule.message,
            pointsLost: missingRule.pointsLost,
            severity: missingRule.severity,
            fix: missingRule.fix,
        });
        bulletDeductions += missingRule.pointsLost;
    }
    const bulletQuality = {
        name: "Bullet & Content Quality",
        score: Math.max(0, 100 - bulletDeductions),
        weight: hasJD ? 0.15 : 0.30,
        items: bulletItems,
    };
    // ─── Keyword Coverage Score (JD only) ───────────────────────
    let keywordCoverage;
    let experienceRelevance;
    if (hasJD && keywordReport) {
        // Keyword coverage: weight required keywords more
        const requiredScore = keywordReport.requiredMatchRate;
        const niceScore = keywordReport.niceToHaveMatchRate;
        const combinedScore = Math.round(requiredScore * 0.7 + niceScore * 0.3);
        const kwItems = [];
        const missingRequired = keywordReport.missing.filter((m) => m.isRequired);
        const missingNice = keywordReport.missing.filter((m) => !m.isRequired);
        for (const missed of missingRequired.slice(0, 5)) {
            kwItems.push({
                description: `Missing required keyword: "${missed.keyword}"`,
                pointsLost: 5,
                severity: "critical",
                fix: `Add "${missed.keyword}" to your resume in context (ideally in a bullet point describing relevant experience).`,
            });
        }
        for (const missed of missingNice.slice(0, 3)) {
            kwItems.push({
                description: `Missing preferred keyword: "${missed.keyword}"`,
                pointsLost: 2,
                severity: "warning",
                fix: `Consider adding "${missed.keyword}" if you have relevant experience.`,
            });
        }
        keywordCoverage = {
            name: "Keyword Coverage",
            score: combinedScore,
            weight: 0.30,
            items: kwItems,
        };
        // Experience relevance: based on keyword placement quality
        const bulletMatches = keywordReport.matched.filter((m) => m.placement === "bullet_with_context").length;
        const totalMatches = keywordReport.matched.length;
        const placementScore = totalMatches > 0 ? Math.round((bulletMatches / totalMatches) * 100) : 50;
        experienceRelevance = {
            name: "Experience Relevance",
            score: placementScore,
            weight: 0.15,
            items: [
                {
                    description: `${bulletMatches}/${totalMatches} matched keywords appear in experience bullets (stronger signal)`,
                    pointsLost: 100 - placementScore,
                    severity: placementScore < 50 ? "warning" : "info",
                    fix: "Move matched skills from your skills list into the body of experience bullets with context.",
                },
            ],
        };
    }
    // ─── Overall Score ───────────────────────────────────────────
    const categories = [parseIntegrity, formattingRisks, bulletQuality, ...(keywordCoverage ? [keywordCoverage] : []), ...(experienceRelevance ? [experienceRelevance] : [])];
    const overall = Math.round(categories.reduce((sum, cat) => sum + cat.score * cat.weight, 0));
    return {
        overall,
        parseIntegrity,
        bulletQuality,
        formattingRisks,
        keywordCoverage,
        experienceRelevance,
        hasJD,
        estimatedLabel: "Estimated parse + match score",
    };
}
