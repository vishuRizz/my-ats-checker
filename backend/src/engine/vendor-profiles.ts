// ============================================================
// Vendor Profiles - ATS Simulator
// PRD §6.7: "approximate simulation of known, documented quirks"
// ============================================================

import type { ParseResult, RuleResult, KeywordReport } from "./types.js";

export type VendorId = "workday" | "greenhouse" | "lever" | "taleo" | "icims";
export type VendorStatus = "pass" | "warning" | "fail";

export interface VendorQuirk {
  id: string;
  title: string;
  status: VendorStatus;
  impact: string;
  reason: string;
  fix?: string;
}

export interface VendorProfileReport {
  vendor: VendorId;
  vendorName: string;
  marketShare: string;
  status: VendorStatus;
  score: number; // 0-100 compatibility estimate
  verdict: string;
  quirks: VendorQuirk[];
}

export function evaluateVendorProfiles(
  parseResult: ParseResult,
  rules: RuleResult[],
  keywordReport: KeywordReport | null
): VendorProfileReport[] {
  const reports: VendorProfileReport[] = [];

  // ─── 1. Workday ──────────────────────────────────────────────
  const workdayQuirks: VendorQuirk[] = [];
  let workdayScore = 100;

  if (parseResult.hasHeaderFooterContent) {
    workdayScore -= 30;
    workdayQuirks.push({
      id: "WD-01",
      title: "Header / Footer Clipping",
      status: "fail",
      impact: "Contact info in header/footer likely stripped",
      reason: "Workday's document ingestion clips top and bottom page margins to remove noise, frequently losing candidate contact details placed in headers.",
      fix: "Move your name, email, phone, and links into the main body text.",
    });
  } else {
    workdayQuirks.push({
      id: "WD-01",
      title: "Contact Info Placement",
      status: "pass",
      impact: "Contact info in main body",
      reason: "Contact info is safely within Workday's readable page boundaries.",
    });
  }

  if (parseResult.isMultiColumn) {
    workdayScore -= 25;
    workdayQuirks.push({
      id: "WD-02",
      title: "Multi-Column Text Flow",
      status: "fail",
      impact: "Reading order may scramble",
      reason: "Workday parses text using coordinate-based horizontal scanning; two columns often merge into alternating fragmented sentences.",
      fix: "Convert to a clean single-column layout.",
    });
  } else {
    workdayQuirks.push({
      id: "WD-02",
      title: "Layout Structure",
      status: "pass",
      impact: "Single-column reading order",
      reason: "Single-column layout ensures clean linear top-to-bottom reading order in Workday.",
    });
  }

  const dateRule = rules.find((r) => r.id === "R006");
  if (dateRule) {
    workdayScore -= 15;
    workdayQuirks.push({
      id: "WD-03",
      title: "Experience Tenure Calculation",
      status: "warning",
      impact: "Tenure calculation issues",
      reason: "Workday calculates years of experience using Month YYYY patterns. Non-standard dates may cause Workday to calculate 0 years of experience.",
      fix: dateRule.fix,
    });
  } else {
    workdayQuirks.push({
      id: "WD-03",
      title: "Date Formatting",
      status: "pass",
      impact: "Standard date ranges detected",
      reason: "Month YYYY dates allow Workday to calculate total years of experience accurately.",
    });
  }

  const tableRule = rules.find((r) => r.id === "R010");
  if (tableRule) {
    workdayScore -= 15;
    workdayQuirks.push({
      id: "WD-04",
      title: "Table & Grid Ingestion",
      status: "warning",
      impact: "Table cell content may merge",
      reason: "Workday flattens table cells without retaining grid hierarchy, occasionally merging cell contents.",
      fix: "Replace tables with tabbed text or bullet lists.",
    });
  }

  const workdayStatus: VendorStatus =
    workdayScore >= 80 ? "pass" : workdayScore >= 60 ? "warning" : "fail";

  reports.push({
    vendor: "workday",
    vendorName: "Workday",
    marketShare: "Used by ~26% of Fortune 500",
    status: workdayStatus,
    score: Math.max(10, workdayScore),
    verdict:
      workdayStatus === "pass"
        ? "Clean pass. Your resume format adheres to Workday's strict parsing expectations."
        : workdayStatus === "warning"
        ? "Moderate risk. Workday may scramble specific sections or calculate tenure incorrectly."
        : "High risk of failure. Layout or header issues may cause Workday to ingest a corrupted profile.",
    quirks: workdayQuirks,
  });

  // ─── 2. Greenhouse ───────────────────────────────────────────
  const greenhouseQuirks: VendorQuirk[] = [];
  let greenhouseScore = 100;

  if (parseResult.isImageOnly) {
    greenhouseScore -= 60;
    greenhouseQuirks.push({
      id: "GH-01",
      title: "Text Layer Extraction",
      status: "fail",
      impact: "No text layer found",
      reason: "Greenhouse uses text-layer extractors; PDFs without selectable text appear blank to recruiters.",
      fix: "Export as text-based PDF or DOCX.",
    });
  } else {
    greenhouseQuirks.push({
      id: "GH-01",
      title: "Text Layer Extraction",
      status: "pass",
      impact: "Clear text layer present",
      reason: "Greenhouse successfully extracts full plain-text stream.",
    });
  }

  // Exact keyword search check
  if (keywordReport && keywordReport.matchRate < 50) {
    greenhouseScore -= 30;
    greenhouseQuirks.push({
      id: "GH-02",
      title: "Exact Keyword Search",
      status: "warning",
      impact: `Low keyword match (${keywordReport.matchRate}%)`,
      reason: "Greenhouse recruiters rely heavily on literal boolean keyword filters. With less than 50% keyword match, this resume will miss standard searches.",
      fix: "Incorporate missing keywords in context within your experience bullets.",
    });
  } else {
    greenhouseQuirks.push({
      id: "GH-02",
      title: "Exact Keyword Search",
      status: "pass",
      impact: keywordReport ? `${keywordReport.matchRate}% keyword match` : "Keywords searchable",
      reason: "Recruiter boolean queries in Greenhouse will surface this profile.",
    });
  }

  const expSection = parseResult.sections.find((s) => s.name === "experience");
  if (!expSection) {
    greenhouseScore -= 20;
    greenhouseQuirks.push({
      id: "GH-03",
      title: "Experience Section Tagging",
      status: "warning",
      impact: "Experience section missing canonical heading",
      reason: "Greenhouse maps resume text to candidate timeline using standard section keywords.",
      fix: "Use standard heading: 'Work Experience' or 'Professional Experience'.",
    });
  }

  const greenhouseStatus: VendorStatus =
    greenhouseScore >= 80 ? "pass" : greenhouseScore >= 60 ? "warning" : "fail";

  reports.push({
    vendor: "greenhouse",
    vendorName: "Greenhouse",
    marketShare: "Dominant in Tech & High-Growth Companies",
    status: greenhouseStatus,
    score: Math.max(10, greenhouseScore),
    verdict:
      greenhouseStatus === "pass"
        ? "Excellent compatibility. Greenhouse extracts clean text and indexes your keywords reliably."
        : "Some issues detected with keyword presence or text layer extraction.",
    quirks: greenhouseQuirks,
  });

  // ─── 3. Lever ────────────────────────────────────────────────
  const leverQuirks: VendorQuirk[] = [];
  let leverScore = 100;

  // Lever contextual weighting
  const bulletMatches =
    keywordReport?.matched.filter((m) => m.placement === "bullet_with_context").length ?? 0;
  const listMatches =
    keywordReport?.matched.filter((m) => m.placement === "skills_list_only").length ?? 0;

  if (listMatches > bulletMatches && keywordReport) {
    leverScore -= 15;
    leverQuirks.push({
      id: "LV-01",
      title: "Contextual Skill Scoring",
      status: "warning",
      impact: "Skills concentrated in list rather than bullets",
      reason: "Lever's candidate search prioritizes skills demonstrated in real role experience over standalone lists.",
      fix: "Move skills from your skills list into bullet point achievements.",
    });
  } else {
    leverQuirks.push({
      id: "LV-01",
      title: "Contextual Skill Scoring",
      status: "pass",
      impact: "Skills demonstrated in context",
      reason: "Lever gives full ranking weight to competencies supported by experience context.",
    });
  }

  // Links check
  if (parseResult.entities.links.length > 0) {
    leverQuirks.push({
      id: "LV-02",
      title: "Portfolio & Social Profiling",
      status: "pass",
      impact: `${parseResult.entities.links.length} link(s) detected`,
      reason: "Lever automatically unfurls GitHub, LinkedIn, and personal website links on the recruiter candidate view.",
    });
  } else {
    leverScore -= 10;
    leverQuirks.push({
      id: "LV-02",
      title: "Portfolio & Social Profiling",
      status: "warning",
      impact: "No portfolio or LinkedIn links detected",
      reason: "Lever highlights candidate web profiles; adding LinkedIn and GitHub increases recruiter engagement.",
      fix: "Add full URLs for your LinkedIn and GitHub profiles.",
    });
  }

  const leverStatus: VendorStatus =
    leverScore >= 80 ? "pass" : leverScore >= 60 ? "warning" : "fail";

  reports.push({
    vendor: "lever",
    vendorName: "Lever",
    marketShare: "Popular in Tech, FinTech & Mid-Market",
    status: leverStatus,
    score: Math.max(10, leverScore),
    verdict:
      leverStatus === "pass"
        ? "High match. Lever will parse your candidate timeline and highlight your work effectively."
        : "Moderate compatibility. Enhance experience context to maximize ranking.",
    quirks: leverQuirks,
  });

  // ─── 4. Taleo (Oracle) ───────────────────────────────────────
  const taleoQuirks: VendorQuirk[] = [];
  let taleoScore = 100;

  // Taleo strict standard headings check
  const nonStandardHeadings = parseResult.sections.filter((s) => s.confidence < 0.65);
  if (nonStandardHeadings.length > 0) {
    taleoScore -= 25;
    taleoQuirks.push({
      id: "TL-01",
      title: "Strict Dictionary Headings",
      status: "fail",
      impact: "Non-standard section titles detected",
      reason: "Taleo uses legacy heading dictionaries. Creative titles like 'What I've Built' or 'Passions' are ignored, causing section data loss.",
      fix: "Use standard headings: 'Experience', 'Education', 'Skills', 'Projects'.",
    });
  } else {
    taleoQuirks.push({
      id: "TL-01",
      title: "Standard Section Headings",
      status: "pass",
      impact: "Standard headings recognized",
      reason: "Taleo's dictionary parser will match all major resume sections.",
    });
  }

  if (parseResult.isMultiColumn) {
    taleoScore -= 30;
    taleoQuirks.push({
      id: "TL-02",
      title: "Multi-Column Resistance",
      status: "fail",
      impact: "Severe parsing degradation",
      reason: "Taleo is notorious for breaking multi-column layouts, merging left and right column paragraphs into unintelligible text blocks.",
      fix: "Use a clean, single-column document.",
    });
  }

  const taleoStatus: VendorStatus =
    taleoScore >= 80 ? "pass" : taleoScore >= 55 ? "warning" : "fail";

  reports.push({
    vendor: "taleo",
    vendorName: "Oracle Taleo",
    marketShare: "Legacy Enterprise & Government ATS",
    status: taleoStatus,
    score: Math.max(10, taleoScore),
    verdict:
      taleoStatus === "pass"
        ? "Adheres to Taleo's strict traditional parsing guidelines."
        : taleoStatus === "warning"
        ? "Warning: Taleo's older parser may fail to segment some sections."
        : "High risk: Taleo will likely scramble formatting and drop crucial fields.",
    quirks: taleoQuirks,
  });

  // ─── 5. iCIMS ────────────────────────────────────────────────
  const icimsQuirks: VendorQuirk[] = [];
  let icimsScore = 100;

  if (parseResult.textToPageRatio < 35 && parseResult.pageCount <= 2) {
    icimsScore -= 35;
    icimsQuirks.push({
      id: "IC-01",
      title: "Text Density Check",
      status: "fail",
      impact: "Low readable text density",
      reason: "iCIMS flags resumes with low text item density as potential scanned images or decorative templates.",
      fix: "Ensure all resume content is written in selectable text rather than images or shapes.",
    });
  } else {
    icimsQuirks.push({
      id: "IC-01",
      title: "Text Density Verification",
      status: "pass",
      impact: "Standard text density",
      reason: "Sufficient text volume for iCIMS keyword and entity indexing.",
    });
  }

  const icimsStatus: VendorStatus =
    icimsScore >= 80 ? "pass" : icimsScore >= 60 ? "warning" : "fail";

  reports.push({
    vendor: "icims",
    vendorName: "iCIMS",
    marketShare: "Major Enterprise & Healthcare ATS (~18%)",
    status: icimsStatus,
    score: Math.max(10, icimsScore),
    verdict:
      icimsStatus === "pass"
        ? "Compatible with iCIMS standard parsing pipeline."
        : "Review text density and formatting to ensure seamless ingestion.",
    quirks: icimsQuirks,
  });

  return reports;
}
