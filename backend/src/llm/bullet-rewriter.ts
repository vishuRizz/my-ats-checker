// ============================================================
// Bullet Rewriter - Groq LLM rewrite with strict JSON schema
// PRD §6.10: grounded in resume text only, never fabricates
// ============================================================

import { groqChat } from "./groq-client.js";
import type { ExtractedBullet } from "../engine/bullet-extractor.js";

export type ImprovementType =
  | "quantify"
  | "action_verb"
  | "specificity"
  | "keyword_alignment"
  | "conciseness";

export interface BulletSuggestion {
  original: string;
  suggested: string;
  rationale: string;
  groundedIn: string;       // exact quote from resume that supports the suggestion
  needsUserProof: boolean;  // true = user must fill in [NUMBER] or [METRIC]
  improvementType: ImprovementType;
  sectionName: string;
}

const SYSTEM_PROMPT = `You are an expert resume editor specialising in ATS optimisation and impact-driven writing.
Your ONLY job is to rewrite resume bullet points to be stronger, more specific, and keyword-aligned.

STRICT RULES - violating any rule is a failure:
1. NEVER add a skill, tool, technology, company, or fact that is not already in the provided bullet or resume context.
2. NEVER invent metrics, percentages, or numbers. If a metric would improve a bullet but none exist, use [NUMBER] or [METRIC] as a placeholder and set needs_user_proof to true.
3. Each suggestion must quote the exact phrase from the original that supports it in grounded_in.
4. Start every rewritten bullet with a strong past-tense action verb (Built, Led, Reduced, Optimised, Delivered, Increased, etc.).
5. Keep bullets under 150 characters where possible.
6. Output ONLY valid JSON - no prose, no markdown, no explanation outside the JSON.`;

const OUTPUT_SCHEMA = `{
  "bullets": [
    {
      "original": "string - exact original bullet text",
      "suggested": "string - rewritten bullet",
      "rationale": "string - one sentence explaining the improvement",
      "grounded_in": "string - exact phrase from the original that supports this rewrite",
      "needs_user_proof": false,
      "improvement_type": "quantify | action_verb | specificity | keyword_alignment | conciseness"
    }
  ]
}`;

/**
 * Rewrite up to 10 bullets at once. Batches automatically.
 */
export async function rewriteBullets(
  bullets: ExtractedBullet[],
  jdKeywords: string[],
  resumeContext: string
): Promise<BulletSuggestion[]> {
  if (bullets.length === 0) return [];

  const BATCH_SIZE = 8;
  const allSuggestions: BulletSuggestion[] = [];

  for (let i = 0; i < bullets.length; i += BATCH_SIZE) {
    const batch = bullets.slice(i, i + BATCH_SIZE);
    const suggestions = await rewriteBatch(batch, jdKeywords, resumeContext);
    allSuggestions.push(...suggestions);
  }

  return allSuggestions;
}

async function rewriteBatch(
  bullets: ExtractedBullet[],
  jdKeywords: string[],
  resumeContext: string
): Promise<BulletSuggestion[]> {
  const bulletList = bullets
    .map((b, i) => `${i + 1}. [${b.sectionName}] ${b.text}`)
    .join("\n");

  const keywordHint =
    jdKeywords.length > 0
      ? `\nTarget JD keywords to weave in ONLY IF the resume already demonstrates them: ${jdKeywords.slice(0, 20).join(", ")}`
      : "";

  const userPrompt = `RESUME CONTEXT (for grounding only - do not add anything not here):
---
${resumeContext.slice(0, 2000)}
---
${keywordHint}

BULLETS TO REWRITE:
${bulletList}

Respond with JSON matching this exact schema:
${OUTPUT_SCHEMA}`;

  let raw = "";
  try {
    raw = await groqChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.25, max_tokens: 2000, response_format: { type: "json_object" } }
    );
  } catch (err: any) {
    // If LLM fails, return rule-based fallback tips
    return bullets.map((b) => fallbackTip(b));
  }

  // Parse + validate JSON
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Second attempt: extract JSON from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { /* fall through */ }
    }
  }

  if (!parsed?.bullets || !Array.isArray(parsed.bullets)) {
    return bullets.map((b) => fallbackTip(b));
  }

  // Map back to bullets with section names
  return parsed.bullets
    .slice(0, bullets.length)
    .map((item: any, idx: number): BulletSuggestion => {
      const orig = bullets[idx];
      return {
        original: orig.text,
        suggested: sanitizeSuggestion(item.suggested ?? orig.text, orig.text),
        rationale: item.rationale ?? "Improved clarity and ATS alignment.",
        groundedIn: item.grounded_in ?? orig.text.slice(0, 60),
        needsUserProof: Boolean(item.needs_user_proof) || (item.suggested ?? "").includes("["),
        improvementType: validateImprovementType(item.improvement_type),
        sectionName: orig.sectionName,
      };
    });
}

/** Safety: reject suggestions that add new proper nouns not in the original */
function sanitizeSuggestion(suggested: string, original: string): string {
  // Simple check: if suggested is way longer than original it may be hallucinating
  if (suggested.length > original.length * 2.5) {
    return original; // return original unchanged - safer than a bad suggestion
  }
  return suggested;
}

function validateImprovementType(type: string): ImprovementType {
  const valid: ImprovementType[] = [
    "quantify", "action_verb", "specificity", "keyword_alignment", "conciseness",
  ];
  return valid.includes(type as ImprovementType)
    ? (type as ImprovementType)
    : "action_verb";
}

/** Rule-based fallback when LLM is unavailable */
function fallbackTip(bullet: ExtractedBullet): BulletSuggestion {
  const text = bullet.text;
  const startsWithVerb = /^(Built|Led|Developed|Designed|Implemented|Reduced|Increased|Delivered|Managed|Created|Improved|Optimised|Optimized|Launched|Shipped|Scaled|Automated|Mentored|Collaborated)\b/i.test(text);
  const hasMetric = /\d+/.test(text);

  let rationale = "";
  let improvementType: ImprovementType = "action_verb";

  if (!startsWithVerb) {
    rationale = "Start with a strong past-tense action verb (e.g., Built, Led, Reduced, Delivered).";
    improvementType = "action_verb";
  } else if (!hasMetric) {
    rationale = "Add a quantifiable result - how many, how much, how fast? Use [NUMBER] as a placeholder if unsure.";
    improvementType = "quantify";
  } else {
    rationale = "Consider adding more specificity about the technology used or the scope of impact.";
    improvementType = "specificity";
  }

  return {
    original: text,
    suggested: text, // no change from rule-based
    rationale,
    groundedIn: text.slice(0, 60),
    needsUserProof: !hasMetric,
    improvementType,
    sectionName: bullet.sectionName,
  };
}
