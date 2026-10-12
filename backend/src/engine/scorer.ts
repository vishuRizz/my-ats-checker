// ============================================================
// Score Calculator v2
// PRD §6.6: Transparent breakdown, deterministic, no LLM contributions
//
// Fixes in v2:
// - Multi-column counted ONCE (in parseIntegrity only, removed from formattingRisks)
// - Experience relevance: continuous scale instead of 1/4 → 25 cliff
//   projects count at 0.5 weight vs experience at 1.0
// - Bullet quality: real checks (action verb, metric, length, tech count, dupes)
// - scoreFormula exposed in output for transparency
// - "contact" removed from required sections (it's an entity, not a section)
// - Date rule: year-only dates flagged with fix suggestion
// ============================================================

import type { ParseResult, RuleResult, KeywordReport, ScoreBreakdown, ScoreCategory, Severity } from "./types.js";

export function computeScore(
  parseResult: ParseResult,
  rules: RuleResult[],
  keywordReport: KeywordReport | null
): ScoreBreakdown {
  const hasJD = keywordReport !== null;

  // ─── Weights ─────────────────────────────────────────────────
  const W = hasJD
    ? { parse: 0.25, bullet: 0.15, format: 0.10, keyword: 0.30, relevance: 0.20 }
    : { parse: 0.40, bullet: 0.30, format: 0.30, keyword: 0, relevance: 0 };

  // ─── Parse Integrity ─────────────────────────────────────────
  // Count each structural issue once.
  const parseItems: ScoreCategory["items"] = [];
  let parseDeduct = 0;

  if (parseResult.isImageOnly) {
    parseDeduct += 50;
    parseItems.push({ description: "Image-only PDF - no text layer", pointsLost: 50, severity: "critical", fix: "Export as text-based PDF from a word processor." });
  }
  if (parseResult.isMultiColumn) {
    parseDeduct += 15;
    parseItems.push({ description: "Multi-column layout detected - reading order may scramble", pointsLost: 15, severity: "critical", fix: "Use a single-column layout so ATS reads top-to-bottom." });
  }
  if (parseResult.hasHeaderFooterContent) {
    parseDeduct += 10;
    parseItems.push({ description: "Contact info in PDF header/footer region (skipped by most ATS)", pointsLost: 10, severity: "critical", fix: "Move name, email, phone into the main body of the document." });
  }

  // Lost regions grouped (not noise - already deduplicated by reading-order)
  const lostGroupCount = parseResult.lostRegions.filter(r => r.reason === "column_merge").length;
  if (lostGroupCount > 0 && parseResult.isMultiColumn) {
    const deduct = Math.min(10, lostGroupCount * 5);
    parseDeduct += deduct;
    parseItems.push({ description: `${lostGroupCount} column-merge region${lostGroupCount > 1 ? "s" : ""} where text may be scrambled`, pointsLost: deduct, severity: "warning", fix: "Convert to single-column layout." });
  }

  if (!parseResult.entities.email.value) {
    parseDeduct += 10;
    parseItems.push({ description: "No email address found in resume body", pointsLost: 10, severity: "critical", fix: "Add email to the resume body (not just PDF header)." });
  }

  const parseIntegrity: ScoreCategory = {
    name: "Parse Integrity",
    score: Math.max(0, 100 - parseDeduct),
    weight: W.parse,
    items: parseItems,
  };

  // ─── Formatting Risks ─────────────────────────────────────────
  // Only formatting issues that are NOT already in Parse Integrity.
  // Multi-column is excluded here (counted once above).
  const formatItems: ScoreCategory["items"] = [];
  let formatDeduct = 0;

  const dateRule = rules.find((r) => r.id === "R006");
  if (dateRule) {
    formatItems.push({ description: dateRule.message, pointsLost: dateRule.pointsLost, severity: dateRule.severity, fix: dateRule.fix });
    formatDeduct += dateRule.pointsLost;
  }

  const tableRule = rules.find((r) => r.id === "R010");
  if (tableRule) {
    formatItems.push({ description: tableRule.message, pointsLost: tableRule.pointsLost, severity: tableRule.severity, fix: tableRule.fix });
    formatDeduct += tableRule.pointsLost;
  }

  // Year-only dates (new check)
  const yearOnlyDates = (parseResult.readingOrderText.match(/\b(20|19)\d{2}\b/g) || []).length;
  const monthYearDates = (parseResult.readingOrderText.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/gi) || []).length;
  if (yearOnlyDates > monthYearDates && yearOnlyDates > 2) {
    const deduct = 5;
    formatDeduct += deduct;
    formatItems.push({ description: `Year-only dates detected (${yearOnlyDates} found) - ATS may not calculate experience duration correctly`, pointsLost: deduct, severity: "warning", fix: "Use 'Mon YYYY – Present' format (e.g., 'Jan 2022 – Present') for all date ranges." });
  }

  const formattingRisks: ScoreCategory = {
    name: "Formatting Risks",
    score: Math.max(0, 100 - formatDeduct),
    weight: W.format,
    items: formatItems,
  };

  // ─── Bullet Quality ───────────────────────────────────────────
  // Real checks: action verb, metric, tech name, length, duplicates
  const bulletItems: ScoreCategory["items"] = [];
  let bulletDeduct = 0;

  const expSection = parseResult.sections.find((s) => s.name === "experience");
  const projSection = parseResult.sections.find((s) => s.name === "projects");
  const allBulletText = [expSection?.text || "", projSection?.text || ""].join("\n");

  const ACTION_VERBS = /^(built|led|designed|developed|architected|shipped|reduced|increased|improved|automated|integrated|migrated|scaled|launched|created|implemented|optimized|managed|wrote|deployed|engineered|delivered|established|streamlined|mentored|coordinated|spearheaded|owned|drove|configured|maintained|refactored|analyzed|monitored|owned|published|grew|generated)/i;
  const HAS_METRIC = /\d+[%x]?|\d+k|\d+\s*(?:users?|customers?|requests?|seconds?|ms|hours?|days?|months?|INR|dollars?|\$|MAU|DAU|wpm|commits?|problems?)/i;
  const HAS_TECH = /\b(react|node|python|typescript|javascript|go|rust|kubernetes|docker|aws|gcp|postgresql|mongodb|graphql|next\.js|react native|prisma|kafka|redis|fastapi|langgraph|llm)\b/i;

  const bulletLines = allBulletText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[–\-•*▸→]/.test(l) || l.startsWith("–"));

  if (bulletLines.length > 0) {
    const noVerb = bulletLines.filter((b) => !ACTION_VERBS.test(b.replace(/^[–\-•*▸→\s]+/, "")));
    const noMetric = bulletLines.filter((b) => !HAS_METRIC.test(b));
    const noTech = bulletLines.filter((b) => !HAS_TECH.test(b));
    const tooLong = bulletLines.filter((b) => b.length > 200);
    // Duplicate detection
    const normalized = bulletLines.map((b) => b.toLowerCase().replace(/\s+/g, " ").trim());
    const dupSet = new Set<string>();
    const dupes = normalized.filter((b) => {
      if (dupSet.has(b)) return true;
      dupSet.add(b);
      return false;
    });

    const verbRate = (bulletLines.length - noVerb.length) / bulletLines.length;
    const metricRate = (bulletLines.length - noMetric.length) / bulletLines.length;

    if (noVerb.length > bulletLines.length * 0.4) {
      const d = 10;
      bulletDeduct += d;
      bulletItems.push({ description: `${noVerb.length}/${bulletLines.length} bullets may lack a strong action verb`, pointsLost: d, severity: "warning", fix: "Start each bullet with a past-tense action verb: Built, Led, Reduced, Shipped, Optimized." });
    }
    if (metricRate < 0.4) {
      const d = 15;
      bulletDeduct += d;
      bulletItems.push({ description: `Only ${bulletLines.length - noMetric.length}/${bulletLines.length} bullets contain a quantified metric`, pointsLost: d, severity: "warning", fix: "Add numbers to bullets: '…reducing load time by 40%', '…serving 50k MAU', '…cutting cost by 30%'." });
    }
    if (noTech.length > bulletLines.length * 0.5) {
      const d = 8;
      bulletDeduct += d;
      bulletItems.push({ description: `${noTech.length} bullets mention no specific technology`, pointsLost: d, severity: "info", fix: "Name the specific tools/languages used in each bullet - ATS matches keywords in context." });
    }
    if (tooLong.length > 0) {
      const d = 5;
      bulletDeduct += d;
      bulletItems.push({ description: `${tooLong.length} bullet${tooLong.length > 1 ? "s" : ""} exceed 200 characters (too long)`, pointsLost: d, severity: "info", fix: "Keep bullets under 150 characters. Split long bullets or remove filler." });
    }
    if (dupes.length > 0) {
      const d = 10;
      bulletDeduct += d;
      bulletItems.push({ description: `${dupes.length} duplicate bullet${dupes.length > 1 ? "s" : ""} detected`, pointsLost: d, severity: "warning", fix: "Remove duplicate bullet points across experience and projects." });
    }
  }

  const bulletQuality: ScoreCategory = {
    name: "Bullet & Content Quality",
    score: Math.max(0, 100 - bulletDeduct),
    weight: W.bullet,
    items: bulletItems,
  };

  // ─── Keyword Coverage (JD only) ──────────────────────────────
  let keywordCoverage: ScoreCategory | undefined;
  let experienceRelevance: ScoreCategory | undefined;

  if (hasJD && keywordReport) {
    // Exclude soft keywords from the score calculation
    const nonSoftRequired = keywordReport.matched.filter((m) => m.isRequired && !m.isSoft).length
      + keywordReport.missing.filter((m) => m.isRequired && !m.isSoft).length;
    const matchedRequired = keywordReport.matched.filter((m) => m.isRequired && !m.isSoft).length;
    const matchedNice = keywordReport.matched.filter((m) => !m.isRequired && !m.isSoft).length;
    const missingRequired = keywordReport.missing.filter((m) => m.isRequired && !m.isSoft);
    const missingNice = keywordReport.missing.filter((m) => !m.isRequired && !m.isSoft);
    const niceTotal = keywordReport.matched.filter(m => !m.isSoft).length
      + keywordReport.missing.filter(m => !m.isSoft).length - nonSoftRequired;

    const reqScore  = nonSoftRequired > 0 ? (matchedRequired / nonSoftRequired) * 100 : 100;
    const niceScore = niceTotal > 0 ? (matchedNice / niceTotal) * 100 : 100;
    const kwScore   = Math.round(reqScore * 0.7 + niceScore * 0.3);

    const kwItems: ScoreCategory["items"] = [];
    for (const m of missingRequired.slice(0, 5)) {
      kwItems.push({
        description: `Required: "${m.keyword}" not found in resume`,
        pointsLost: Math.round(70 / Math.max(nonSoftRequired, 1)),
        severity: "critical",
        fix: `Add "${m.keyword}" in context - ideally inside an experience bullet describing work you've done with it.`,
      });
    }
    for (const m of missingNice.slice(0, 4)) {
      kwItems.push({
        description: `Preferred: "${m.keyword}" not found (${m.tier === "soft" ? "soft requirement - low priority" : "strong signal"})`,
        pointsLost: Math.round(30 / Math.max(niceTotal, 1)),
        severity: m.tier === "soft" ? "info" : "warning",
        fix: `Add "${m.keyword}" if you have experience with it.`,
      });
    }

    keywordCoverage = {
      name: "Keyword Coverage",
      score: kwScore,
      weight: W.keyword,
      items: kwItems,
    };

    // ─── Experience Relevance - continuous scale ──────────────
    // Matched keywords weighted by placement quality:
    //   bullet_with_context → 1.0
    //   projects_context    → 0.6
    //   skills_list_only    → 0.25
    const allMatched = keywordReport.matched.filter((m) => !m.isSoft);
    const weightedScore = allMatched.reduce((sum, m) => {
      const w = m.placement === "bullet_with_context" ? 1.0
              : m.placement === "projects_context"    ? 0.6
              : 0.25;
      return sum + w;
    }, 0);

    const maxPossible = allMatched.length;
    const relevanceScore = maxPossible > 0
      ? Math.round((weightedScore / maxPossible) * 100)
      : 50;

    const bulletMatchCount = allMatched.filter((m) => m.placement === "bullet_with_context").length;
    const projectsMatchCount = allMatched.filter((m) => m.placement === "projects_context").length;
    const listOnlyCount = allMatched.filter((m) => m.placement === "skills_list_only").length;

    const relevanceItems: ScoreCategory["items"] = [];
    if (listOnlyCount > 0) {
      relevanceItems.push({
        description: `${listOnlyCount} matched keyword${listOnlyCount > 1 ? "s" : ""} only appear in the skills list (weak ATS signal)`,
        pointsLost: Math.round(listOnlyCount / allMatched.length * 40),
        severity: "warning",
        fix: "Move skills from the list into experience bullet context: 'Built X using [skill] to achieve Y.'",
      });
    }
    if (projectsMatchCount > 0 && bulletMatchCount === 0) {
      relevanceItems.push({
        description: `${projectsMatchCount} matched skill${projectsMatchCount > 1 ? "s" : ""} appear only in Projects (good, but experience context is stronger)`,
        pointsLost: 10,
        severity: "info",
        fix: "If you used these skills professionally, add them to experience bullets too.",
      });
    }
    if (relevanceItems.length === 0) {
      relevanceItems.push({
        description: `${bulletMatchCount}/${allMatched.length} matched keywords appear in experience/project bullets - strong ATS signal`,
        pointsLost: 0,
        severity: "info" as Severity,
        fix: "",
      });
    }

    experienceRelevance = {
      name: "Experience Relevance",
      score: relevanceScore,
      weight: W.relevance,
      items: relevanceItems,
    };
  }

  // ─── Overall Score ───────────────────────────────────────────
  const categories = [
    parseIntegrity,
    formattingRisks,
    bulletQuality,
    ...(keywordCoverage    ? [keywordCoverage]    : []),
    ...(experienceRelevance ? [experienceRelevance] : []),
  ];

  const overall = Math.round(
    categories.reduce((sum, cat) => sum + cat.score * cat.weight, 0)
  );

  const scoreFormula = hasJD
    ? `Parse Integrity×${W.parse} + Bullet Quality×${W.bullet} + Formatting×${W.format} + Keyword Coverage×${W.keyword} + Experience Relevance×${W.relevance}`
    : `Parse Integrity×${W.parse} + Bullet Quality×${W.bullet} + Formatting×${W.format}`;

  return {
    overall,
    parseIntegrity,
    bulletQuality,
    formattingRisks,
    keywordCoverage,
    experienceRelevance,
    hasJD,
    estimatedLabel: "Estimated parse + match score",
    scoreFormula,
  };
}
