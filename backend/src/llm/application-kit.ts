// ============================================================
// Application Kit Generator - Groq LLM Cover Letter & LinkedIn Summary
// Tailored to Job Description & candidate's genuine achievements
// ============================================================

import { groqChat } from "./groq-client.js";

export interface GenerateKitRequest {
  candidateName?: string;
  resumeText: string;
  skills: string[];
  jdText: string;
  type: "cover_letter" | "linkedin_summary";
  tone?: "professional" | "confident" | "concise";
}

export interface GenerateKitResponse {
  content: string;
  type: "cover_letter" | "linkedin_summary";
  keyMatchesHighlighted: string[];
  wordCount: number;
}

export async function generateApplicationKit(
  req: GenerateKitRequest
): Promise<GenerateKitResponse> {
  const {
    candidateName = "Candidate",
    resumeText,
    skills,
    jdText,
    type,
    tone = "professional",
  } = req;

  const toneGuidance =
    tone === "confident"
      ? "Tone: Bold, results-driven, highly modern, focusing on outcomes and leadership."
      : tone === "concise"
      ? "Tone: High density, punchy, bullet-oriented, zero fluff or filler words."
      : "Tone: Balanced, polished, articulate, professional, and authentic.";

  if (type === "cover_letter") {
    const systemPrompt = `You are an elite career strategist and executive coach.
Your task is to write a compelling, tailored, ATS-friendly cover letter for the candidate based strictly on their resume and the target job description.

STRICT GUIDELINES:
1. Ground every claim strictly in the candidate's actual background and experience. DO NOT invent skills, certifications, metrics, or previous employers.
2. Explicitly map their genuine accomplishments to the top requirements in the job description.
3. Keep it between 250 and 380 words across 3-4 structured paragraphs:
   - Paragraph 1: Powerful hook expressing enthusiastic alignment with the specific role and company mission.
   - Paragraph 2: Core proof points - 1-2 major achievements directly solving problems mentioned in the JD.
   - Paragraph 3: Additional domain competence, technical skills synergy, and cultural contribution.
   - Paragraph 4: Confident closing with an interview call-to-action.
4. ${toneGuidance}
5. Return ONLY a valid JSON object matching:
{
  "content": "Full markdown-formatted cover letter text",
  "keyMatchesHighlighted": ["skill1", "skill2", "skill3"]
}`;

    const userPrompt = `CANDIDATE NAME: ${candidateName}
CORE SKILLS: ${skills.slice(0, 30).join(", ")}

RESUME CONTEXT:
---
${resumeText.slice(0, 3500)}
---

TARGET JOB DESCRIPTION:
---
${jdText.slice(0, 3500)}
---

Generate the tailored cover letter in valid JSON format.`;

    const raw = await groqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.35, max_tokens: 1500, response_format: { type: "json_object" } }
    );

    const parsed = parseJsonSafely(raw);
    const content = parsed?.content || generateFallbackCoverLetter(candidateName, skills, jdText);
    const keyMatchesHighlighted = Array.isArray(parsed?.keyMatchesHighlighted)
      ? parsed.keyMatchesHighlighted
      : skills.slice(0, 5);

    return {
      content,
      type: "cover_letter",
      keyMatchesHighlighted,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    };
  } else {
    // LinkedIn Summary / Executive Bio
    const systemPrompt = `You are a premier executive branding specialist.
Your task is to craft a modern, high-converting LinkedIn "About" / Executive Summary tailored to positioning the candidate for roles matching the target job description.

STRICT GUIDELINES:
1. Write in first-person ("I"). Ground strictly in the candidate's real capabilities and career trajectory.
2. Structure:
   - Hook: 1-2 sentences capturing their core engineering/professional identity and passion.
   - Core Value / What I Do: 2-3 sentences on technical depth and real-world impact.
   - Key Highlights / Competencies: Clean bullet points highlighting verified tools and domains.
   - What Drives Me / Let's Connect: A welcoming closing inviting conversations.
3. Optimize for ATS search algorithms and human recruiters (scannable, keyword-dense without keyword stuffing).
4. ${toneGuidance}
5. Return ONLY a valid JSON object matching:
{
  "content": "Full markdown-formatted LinkedIn summary",
  "keyMatchesHighlighted": ["skill1", "skill2", "skill3"]
}`;

    const userPrompt = `CANDIDATE NAME: ${candidateName}
CORE SKILLS: ${skills.slice(0, 30).join(", ")}

RESUME CONTEXT:
---
${resumeText.slice(0, 3500)}
---

TARGET ROLE CONTEXT (JD):
---
${jdText.slice(0, 3500)}
---

Generate the tailored LinkedIn About summary in valid JSON format.`;

    const raw = await groqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.35, max_tokens: 1200, response_format: { type: "json_object" } }
    );

    const parsed = parseJsonSafely(raw);
    const content = parsed?.content || generateFallbackLinkedIn(candidateName, skills);
    const keyMatchesHighlighted = Array.isArray(parsed?.keyMatchesHighlighted)
      ? parsed.keyMatchesHighlighted
      : skills.slice(0, 5);

    return {
      content,
      type: "linkedin_summary",
      keyMatchesHighlighted,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    };
  }
}

function parseJsonSafely(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function generateFallbackCoverLetter(
  name: string,
  skills: string[],
  jdText: string
): string {
  const topSkills = skills.slice(0, 4).join(", ") || "relevant domain technologies";
  return `Dear Hiring Manager,

I am writing to express my strong interest in this position. Having reviewed the role's requirements, I am confident that my practical background in ${topSkills} aligns closely with the objectives of your team.

Throughout my career, I have focused on delivering scalable, reliable solutions and driving measurable impact. My experience has equipped me to quickly ramp up, solve complex technical challenges, and collaborate effectively across engineering and product teams.

I would welcome the opportunity to discuss how my skill set and proactive approach can contribute to your team's ongoing success. Thank you for your time and consideration.

Sincerely,
${name}`;
}

function generateFallbackLinkedIn(name: string, skills: string[]): string {
  const skillsList = skills.slice(0, 6).join(" • ") || "Software Engineering • Problem Solving";
  return `Hi, I'm ${name}.

I build high-impact, reliable software systems with a focus on clean engineering, scalability, and performance.

Core Specialties:
${skillsList}

Always interested in connecting with fellow engineers, builders, and innovators tackling interesting technical challenges.`;
}
