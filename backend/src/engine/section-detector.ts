// ============================================================
// Section Detector v2
// PRD §6.2: Section detection by heading, including non-standard names
//
// Fixes in v2:
// - Heading must be ALONE on its line (±5pt y-tolerance, alone = only item in row)
//   OR styled (bold/larger) AND match a known synonym
// - "Portfolio", "Languages" inline in a link-bar are NOT headings (they share a y-row)
// - Dedup: merge same canonical sections; keep first occurrence, append text
// - Contact is an ENTITY (email+phone), NOT a section — removed from section detection
//   and removed from "required sections" rule check
// - "Languages" in skills section map kept but gated by alone-on-line requirement
// ============================================================

import type { Section, TextItem } from "./types.js";

// Canonical section names (contact removed — it's an entity, not a section)
const SECTION_MAP: Record<string, string[]> = {
  summary: [
    "summary", "professional summary", "executive summary", "career summary",
    "profile", "professional profile", "about me", "objective", "career objective",
    "professional objective", "overview", "personal statement", "introduction",
    "about", "bio", "background",
  ],
  experience: [
    "experience", "work experience", "professional experience", "employment",
    "employment history", "work history", "career history", "career experience",
    "positions", "positions held", "relevant experience", "industry experience",
    "where i've worked", "where i worked", "my experience", "previous roles",
    "professional background", "job history", "roles", "internships", "internship",
    "professional roles",
  ],
  education: [
    "education", "academic background", "academic history", "educational background",
    "qualifications", "academic qualifications", "degrees", "academics",
    "schools", "universities", "my education", "educational qualifications",
    "academic credentials",
  ],
  skills: [
    "skills", "technical skills", "core skills", "key skills", "skill set",
    "skillset", "competencies", "core competencies", "expertise", "proficiencies",
    "technologies", "tools", "tools & technologies", "tools and technologies",
    "technical expertise", "technical proficiencies", "abilities", "capabilities",
    "what i know", "programming languages", "tech stack",
    "software skills", "hard skills", "soft skills",
  ],
  projects: [
    "projects", "personal projects", "side projects", "open source",
    "notable projects", "key projects", "selected projects",
    "project experience", "project work",
  ],
  certifications: [
    "certifications", "certificates", "certification", "credentials",
    "professional certifications", "licenses", "accreditations",
    "professional development", "courses", "online courses",
  ],
  awards: [
    "awards", "achievements", "honors", "honours", "recognition",
    "accomplishments", "awards & recognition", "awards and recognition",
  ],
  publications: [
    "publications", "papers", "research", "research papers", "conference papers",
    "books", "authored works",
  ],
  volunteering: [
    "volunteering", "volunteer work", "volunteer experience", "community",
    "community involvement", "civic activities",
  ],
  interests: [
    "interests", "hobbies", "personal interests", "activities",
  ],
  references: [
    "references", "professional references", "referees",
  ],
};

// Build reverse lookup: lowercase synonym → canonical name
const SYNONYM_LOOKUP = new Map<string, string>();
for (const [canonical, synonyms] of Object.entries(SECTION_MAP)) {
  for (const syn of synonyms) {
    SYNONYM_LOOKUP.set(syn.toLowerCase(), canonical);
  }
}

/**
 * Check if a text item is a section heading.
 *
 * STRICT criteria (both required):
 *   1. It is alone on its line (no other text item within ±6pt of its y0) — this
 *      prevents "Portfolio" in a link row from being a heading.
 *   2. It matches a known synonym OR is styled (bold or larger font).
 *
 * Exception: if the synonym match is very high-confidence (exact match to canonical),
 * allow it even if not completely alone, but require font prominence.
 */
function isLikelyHeading(
  item: TextItem,
  avgFontSize: number,
  linemates: TextItem[]  // other items on the same y-row (±6pt)
): boolean {
  const text = item.text.trim();
  if (text.length === 0 || text.length > 60) return false;

  const normalized = text.toLowerCase().replace(/[:\-–—|•·]/g, "").trim();
  const isSynonymMatch = SYNONYM_LOOKUP.has(normalized);

  // A heading must be the only meaningful text on its line
  // (linemates excludes the item itself and any whitespace-only items)
  const aloneOnLine = linemates.filter((m) => m.text.trim().length > 1).length === 0;

  // Style check
  const isLarger = item.fontSize > avgFontSize * 1.12;
  const isAllCaps = text === text.toUpperCase() && text.length > 2 && /[A-Z]/.test(text);
  const isProminent = item.isBold || isLarger || isAllCaps;

  if (!aloneOnLine) {
    // Not alone on line: must BOTH match synonym AND be prominent to qualify
    return isSynonymMatch && isProminent;
  }

  // Alone on line: must match synonym OR be prominent (but not just any word alone)
  if (isSynonymMatch) return true;
  // If not a synonym, must be prominently styled AND short
  return isProminent && text.length <= 40 && /^[A-Z]/.test(text);
}

function normalizeHeading(text: string): string | null {
  const normalized = text.toLowerCase().replace(/[:\-–—|•·]/g, "").trim();
  return SYNONYM_LOOKUP.get(normalized) || null;
}

export function detectSections(items: TextItem[], fullText: string): Section[] {
  if (items.length === 0) return [];

  const avgFontSize = items.reduce((sum, i) => sum + i.fontSize, 0) / items.length;

  // Sort by page → y → x
  const sorted = [...items].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    const yDiff = a.bbox.y0 - b.bbox.y0;
    if (Math.abs(yDiff) > 3) return yDiff;
    return a.bbox.x0 - b.bbox.x0;
  });

  // Build line groups: items within ±6pt y are "on the same line"
  const lineGroups = new Map<number, TextItem[]>();
  for (const item of sorted) {
    const key = Math.round(item.bbox.y0 / 6) * 6;
    if (!lineGroups.has(key)) lineGroups.set(key, []);
    lineGroups.get(key)!.push(item);
  }

  // Find headings: item is a heading candidate if alone+styled or synonym
  interface HeadingMark {
    index: number;
    canonical: string;
    rawHeading: string;
    page: number;
    y: number;
  }

  const headings: HeadingMark[] = [];
  let idx = 0;

  for (const item of sorted) {
    const text = item.text.trim();
    if (!text) { idx++; continue; }

    // Get other items on the same line (same y ±6pt), excluding self
    const lineKey = Math.round(item.bbox.y0 / 6) * 6;
    const linemates = (lineGroups.get(lineKey) || []).filter((m) => m !== item);

    if (isLikelyHeading(item, avgFontSize, linemates)) {
      const canonical = normalizeHeading(text);
      if (canonical) {
        // Dedup: skip if same canonical was just seen (consecutive headings)
        const last = headings[headings.length - 1];
        if (!last || last.canonical !== canonical || last.page !== item.page) {
          headings.push({ index: idx, canonical, rawHeading: text, page: item.page, y: item.bbox.y0 });
        }
      }
    }
    idx++;
  }

  if (headings.length === 0) {
    return [{ name: "unlabeled", rawHeading: "", text: fullText, startPage: 1, confidence: 0.5 }];
  }

  // Build sections from text between heading markers
  const rawSections: Section[] = [];
  for (let hi = 0; hi < headings.length; hi++) {
    const heading = headings[hi];
    const nextHeading = headings[hi + 1];
    const startIdx = heading.index;
    const endIdx = nextHeading ? nextHeading.index : sorted.length;

    const sectionItems = sorted.slice(startIdx + 1, endIdx);
    const sectionText = sectionItems.map((si) => si.text).join(" ").trim();

    rawSections.push({
      name: heading.canonical,
      rawHeading: heading.rawHeading,
      text: sectionText,
      startPage: heading.page,
      confidence: 0.85,
    });
  }

  // Dedup: merge sections with the same canonical name
  // (e.g., two "projects" entries → keep first heading, concatenate text)
  const merged = new Map<string, Section>();
  for (const section of rawSections) {
    if (merged.has(section.name)) {
      // Append text
      merged.get(section.name)!.text += "\n" + section.text;
    } else {
      merged.set(section.name, { ...section });
    }
  }
  const sections = [...merged.values()];

  return sections;
}

/**
 * Extract contact entities from text.
 * Contact is treated as an entity (email + phone), not a section.
 */
export function extractEntities(text: string, sections: Section[]) {
  // Email — strict pattern
  const emailMatch = text.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/);

  // Phone — 7-15 digits with optional formatting
  // Be precise: avoid matching years or zip codes
  const phoneMatch = text.match(
    /(?<!\d)(?:\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}(?!\d)|(?<!\d)\d{10}(?!\d)/
  );

  // URLs from text (in addition to PDF annotations)
  const urlMatches = [
    ...text.matchAll(/https?:\/\/[^\s)>\]"]+/gi),
    ...text.matchAll(/(?:linkedin|github|portfolio|upwork|leetcode|behance|dribbble)\.com\/[^\s)>\]",|]+/gi),
  ];

  // Name: first line that looks like a name
  const nameMatch = extractName(text);

  // Skills from skills section
  const skillsSection = sections.find((s) => s.name === "skills");
  const skills = skillsSection ? extractSkillsList(skillsSection.text) : [];

  // Experience entries
  const expSection = sections.find((s) => s.name === "experience");
  const experience = expSection ? extractExperienceEntries(expSection.text) : [];

  // Education entries
  const eduSection = sections.find((s) => s.name === "education");
  const education = eduSection ? extractEducationEntries(eduSection.text) : [];

  // Deduplicate URLs
  const seenUrls = new Set<string>();
  const links: string[] = [];
  for (const m of urlMatches) {
    const url = m[0].replace(/[.,;:]+$/, ""); // strip trailing punctuation
    if (!seenUrls.has(url.toLowerCase())) {
      seenUrls.add(url.toLowerCase());
      links.push(url);
    }
  }

  return {
    name: { value: nameMatch, confidence: nameMatch ? 0.85 : 0.0, sourceBbox: null },
    email: { value: emailMatch ? emailMatch[0] : "", confidence: emailMatch ? 0.97 : 0.0 },
    phone: { value: phoneMatch ? phoneMatch[0].trim() : "", confidence: phoneMatch ? 0.82 : 0.0 },
    links: links.slice(0, 15),
    experience,
    education,
    skills,
  };
}

function extractName(text: string): string {
  const lines = text.split("\n").slice(0, 5);
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length > 3 &&
      trimmed.length < 55 &&
      !trimmed.includes("@") &&
      !/^\d/.test(trimmed) &&
      !/^(http|www)/i.test(trimmed) &&
      !/^(resume|curriculum|cv)\b/i.test(trimmed) &&
      // 2-4 words, mostly letters
      /^[A-Za-z][A-Za-z\s\-'.]{3,50}$/.test(trimmed) &&
      trimmed.split(/\s+/).length >= 2 &&
      trimmed.split(/\s+/).length <= 5
    ) {
      return trimmed;
    }
  }
  return "";
}

function extractSkillsList(text: string): string[] {
  const skills: string[] = [];

  // The section text is space-joined from reading-order. We need to split on
  // category label patterns like "Languages : X, Y" "Frameworks & Libraries : X, Y"
  // Pattern: word(s) followed by " : " or ": " at the start of a chunk
  const categoryPattern = /(?:^|(?<=[,;]\s*))([A-Z][A-Za-z\s&]+)\s*:\s*/g;

  // First split on common category separators to get chunks
  const chunks = text
    .split(/\b(?:Languages|Frameworks?\s*&\s*Libraries?|Databases?|Developer\s+Tools?|Other|Tools?|Technologies|Skills?)\s*[:\s]+/i)
    .slice(1); // first chunk is empty before first category

  if (chunks.length > 0) {
    for (const chunk of chunks) {
      // Each chunk: "JavaScript, TypeScript, C++ Frameworks & Libraries : ..."
      // Take text up to the next label-like pattern
      const nextLabel = chunk.search(/\b(?:Languages|Frameworks|Databases|Developer|Other|Tools|Technologies)\b/i);
      const relevant = nextLabel > 0 ? chunk.slice(0, nextLabel) : chunk;
      const parts = relevant
        .replace(/[•·▪▸→\-–—]/g, ",")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 50 && !/^\d+$/.test(s));
      skills.push(...parts);
    }
  } else {
    // Fallback: simple comma split with category label stripping
    const lines = text.split(/[\n|]/);
    for (const line of lines) {
      const stripped = line.replace(/^[^:]+:\s*/, "").trim();
      const parts = stripped
        .replace(/[•·▪▸→\-–—]/g, ",")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 50 && !/^\d+$/.test(s));
      skills.push(...parts);
    }
  }

  return [...new Set(skills.filter(Boolean))];
}

function extractExperienceEntries(text: string) {
  const entries: any[] = [];
  // Match job title — company — date lines
  // Pattern: lines that have a year range or "Present"
  const lines = text.split("\n");
  const datePattern = /(\d{4})\s*[-–—]\s*(\d{4}|[Pp]resent|[Cc]urrent)/;

  let currentEntry: any = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const dateMatch = trimmed.match(datePattern);
    if (dateMatch) {
      // This line contains a date range — likely a job title line
      if (currentEntry) entries.push(currentEntry);
      currentEntry = {
        raw: trimmed,
        start: dateMatch[1],
        end: dateMatch[2],
        bullets: [],
        confidence: 0.7,
      };
    } else if (currentEntry && /^[–\-•*▸→]/.test(trimmed)) {
      currentEntry.bullets.push(trimmed.replace(/^[–\-•*▸→]\s*/, ""));
    }
  }
  if (currentEntry) entries.push(currentEntry);

  return entries;
}

function extractEducationEntries(text: string) {
  const degreePattern = /(?:B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|Ph\.?D\.?|MBA|Bachelor|Master|Associate|Doctor)/gi;
  const yearPattern = /\b(19|20)\d{2}\b/g;

  const degrees = [...text.matchAll(degreePattern)].map((m) => m[0]);
  const years = [...text.matchAll(yearPattern)].map((m) => m[0]);

  if (degrees.length === 0) return [];

  return [{
    institution: "",
    degree: degrees[0] || "",
    field: "",
    year: years[years.length - 1] || "",
    confidence: 0.65,
  }];
}

export { SECTION_MAP, SYNONYM_LOOKUP };
