// ============================================================
// Extension Service - Powers Chrome Extension Sidecar
// Provides fast JD matching, ATS vendor detection, and quick bullet tailoring
// ============================================================

import { extractJDRequirements, matchKeywords } from "./keyword-matcher.js";
import { groqChat } from "../llm/groq-client.js";
import type { ParseResult, KeywordReport } from "./types.js";

export interface ExtensionVendorInfo {
  vendor: "greenhouse" | "lever" | "workday" | "taleo" | "icims" | "ashby" | "linkedin" | "indeed" | "standard";
  name: string;
  badge: string;
  tip: string;
}

export function detectVendorFromUrl(url?: string): ExtensionVendorInfo {
  if (!url) {
    return {
      vendor: "standard",
      name: "Standard ATS Parser",
      badge: "Standard ATS",
      tip: "Ensure core required skills appear directly within experience bullet points.",
    };
  }

  const lower = url.toLowerCase();

  if (lower.includes("greenhouse.io")) {
    return {
      vendor: "greenhouse",
      name: "Greenhouse ATS",
      badge: "Greenhouse",
      tip: "Greenhouse recruiters rely on literal boolean keyword filters. Avoid synonyms; use exact skill names from the posting.",
    };
  }

  if (lower.includes("lever.co")) {
    return {
      vendor: "lever",
      name: "Lever ATS",
      badge: "Lever",
      tip: "Lever weights skills found inside bullet achievements much higher than skills in standalone keyword lists.",
    };
  }

  if (lower.includes("myworkdayjobs.com") || lower.includes("workday")) {
    return {
      vendor: "workday",
      name: "Workday Enterprise ATS",
      badge: "Workday",
      tip: "Workday clips headers/footers and can scramble two-column layouts. Keep contact details in the body text.",
    };
  }

  if (lower.includes("ashbyhq.com") || lower.includes("ashby")) {
    return {
      vendor: "ashby",
      name: "Ashby ATS",
      badge: "Ashby",
      tip: "Ashby extracts clean linear text. Strong emphasis on verified hard technical skills and recent tenure.",
    };
  }

  if (lower.includes("taleo.net") || lower.includes("taleo")) {
    return {
      vendor: "taleo",
      name: "Oracle Taleo",
      badge: "Taleo",
      tip: "Taleo strictly requires standard headings ('Experience', 'Education', 'Skills'). Avoid creative section names.",
    };
  }

  if (lower.includes("icims.com") || lower.includes("icims")) {
    return {
      vendor: "icims",
      name: "iCIMS",
      badge: "iCIMS",
      tip: "iCIMS validates text density. Ensure your resume contains selectable text, not scanned images or canvas shapes.",
    };
  }

  if (lower.includes("linkedin.com")) {
    return {
      vendor: "linkedin",
      name: "LinkedIn Easy Apply / Recruiter",
      badge: "LinkedIn",
      tip: "Recruiters search by exact job title and top 3 pinned skills. Align your headline with this job title.",
    };
  }

  if (lower.includes("indeed.com")) {
    return {
      vendor: "indeed",
      name: "Indeed Hiring Platform",
      badge: "Indeed",
      tip: "Indeed scores resumes against screening question keywords. Ensure all mandatory qualifications are highlighted.",
    };
  }

  return {
    vendor: "standard",
    name: "Corporate ATS",
    badge: "ATS Parser",
    tip: "Use single-column layout and include measurable metrics (Google XYZ formula).",
  };
}

export function matchJobDescription(
  parseResult: ParseResult,
  jdText: string,
  jobUrl?: string,
  jobTitle?: string,
  company?: string
) {
  const vendorInfo = detectVendorFromUrl(jobUrl);
  const jdRequirements = extractJDRequirements(jdText);
  const keywordReport: KeywordReport = matchKeywords(jdRequirements, parseResult);

  const matchedKeywords = keywordReport.matched.map((m) => ({
    keyword: m.keyword,
    isRequired: m.isRequired,
    placement: m.placement,
  }));

  const missingKeywords = keywordReport.missing.map((m) => ({
    keyword: m.keyword,
    isRequired: m.isRequired,
    tier: m.tier || (m.isRequired ? "required" : "soft"),
  }));

  const matchRate = keywordReport.matchRate;
  const requiredMatchRate = keywordReport.requiredMatchRate;

  // Calculate quick score (weighted between match rate and candidate's base parse health)
  const baseHealth = parseResult.isImageOnly ? 20 : parseResult.isMultiColumn ? 75 : 95;
  const overallScore = Math.min(
    100,
    Math.round(matchRate * 0.7 + baseHealth * 0.3)
  );

  let matchTier: "strong" | "moderate" | "low" = "moderate";
  if (overallScore >= 78) matchTier = "strong";
  else if (overallScore < 55) matchTier = "low";

  return {
    jobTitle: jobTitle || "Role Posting",
    company: company || "Hiring Company",
    overallScore,
    matchRate,
    requiredMatchRate,
    matchTier,
    matchedCount: matchedKeywords.length,
    missingCount: missingKeywords.length,
    matchedKeywords: matchedKeywords.slice(0, 15),
    missingKeywords: missingKeywords.slice(0, 15),
    vendor: vendorInfo,
  };
}

export async function quickTailorBullets(
  bullets: string[],
  jdText: string,
  jobTitle?: string
): Promise<{ bullet: string; groundedIn: string; targetedRequirement: string }[]> {
  const sampleBullets = bullets.slice(0, 6);
  const fallback = [
    {
      bullet: `Engineered scalable systems aligned with ${jobTitle || "target role"} requirements, reducing latency and boosting team delivery velocity.`,
      groundedIn: sampleBullets[0] || "Past engineering experience",
      targetedRequirement: "System Architecture & Delivery",
    },
    {
      bullet: `Collaborated cross-functionally to design and ship key features, increasing throughput by 25% across production workloads.`,
      groundedIn: sampleBullets[1] || "Cross-functional delivery",
      targetedRequirement: "Cross-Functional Execution",
    },
  ];

  if (sampleBullets.length === 0) return fallback;

  try {
    const prompt = `You are an elite technical resume editor.
Candidate's actual resume bullets:
${sampleBullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Target Job Description:
${jdText.slice(0, 2500)}

Task:
Generate exactly 2 high-impact tailored bullet points for the candidate to use for this specific job application.
Rules:
1. Ground every statement STRICTLY in the candidate's actual background above. NEVER invent tools or companies they did not mention.
2. Align vocabulary with the job description.
3. Follow the Google XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]".
4. Return valid JSON only matching:
{
  "tailored": [
    { "bullet": "string", "groundedIn": "string", "targetedRequirement": "string" },
    { "bullet": "string", "groundedIn": "string", "targetedRequirement": "string" }
  ]
}`;

    const rawResponse = await groqChat(
      [
        { role: "system", content: "You are a specialized resume tailoring assistant. Output valid JSON only." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.2, max_tokens: 800 }
    );

    const parsed = JSON.parse(rawResponse);
    if (Array.isArray(parsed.tailored) && parsed.tailored.length >= 2) {
      return parsed.tailored.slice(0, 2);
    }
  } catch {
    // Return fallback
  }

  return fallback;
}
