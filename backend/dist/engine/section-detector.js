"use strict";
// ============================================================
// Section Detector
// PRD §6.2: "Section detection by heading, including non-standard names"
// Uses synonym map to handle "Where I've Worked" → Experience
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYNONYM_LOOKUP = exports.SECTION_MAP = void 0;
exports.detectSections = detectSections;
exports.extractEntities = extractEntities;
// Canonical section names and all their known synonyms
const SECTION_MAP = {
    contact: [
        "contact", "contact information", "contact info", "personal information",
        "personal details", "personal info", "reach me", "get in touch",
    ],
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
        "training", "academic credentials",
    ],
    skills: [
        "skills", "technical skills", "core skills", "key skills", "skill set",
        "skillset", "competencies", "core competencies", "expertise", "proficiencies",
        "technologies", "tools", "tools & technologies", "tools and technologies",
        "technical expertise", "technical proficiencies", "abilities", "capabilities",
        "what i know", "languages", "programming languages", "tech stack",
        "software skills", "hard skills", "soft skills",
    ],
    projects: [
        "projects", "personal projects", "side projects", "open source",
        "portfolio", "notable projects", "key projects", "selected projects",
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
    languages: [
        "languages", "language skills", "spoken languages", "foreign languages",
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
exports.SECTION_MAP = SECTION_MAP;
// Build reverse lookup: lowercase synonym → canonical name
const SYNONYM_LOOKUP = new Map();
exports.SYNONYM_LOOKUP = SYNONYM_LOOKUP;
for (const [canonical, synonyms] of Object.entries(SECTION_MAP)) {
    for (const syn of synonyms) {
        SYNONYM_LOOKUP.set(syn.toLowerCase(), canonical);
    }
}
/**
 * Check if a text item looks like a section heading.
 * Criteria: short text, prominent font (bold or larger), all caps or title case
 */
function isLikelyHeading(item, avgFontSize) {
    const text = item.text.trim();
    if (text.length === 0 || text.length > 60)
        return false;
    // Check if it matches any known section synonym
    const normalized = text.toLowerCase().replace(/[:\-–-|]/g, "").trim();
    if (SYNONYM_LOOKUP.has(normalized))
        return true;
    // Also check if it's a heading-like text (bold, larger font, all caps, etc.)
    const isLarger = item.fontSize > avgFontSize * 1.1;
    const isAllCaps = text === text.toUpperCase() && text.length > 2;
    const isBoldOrLarge = item.isBold || isLarger;
    return isBoldOrLarge && (isAllCaps || text.length < 40);
}
/**
 * Normalize heading text to canonical section name.
 * Returns null if not a known section.
 */
function normalizeHeading(text) {
    const normalized = text.toLowerCase().replace(/[:\-–-|•·]/g, "").trim();
    return SYNONYM_LOOKUP.get(normalized) || null;
}
/**
 * Detect sections from text items with coordinate info.
 * Returns an array of sections with their text content.
 */
function detectSections(items, fullText) {
    if (items.length === 0)
        return [];
    // Calculate average font size
    const avgFontSize = items.reduce((sum, i) => sum + i.fontSize, 0) / items.length;
    // Sort items by page then y-coordinate
    const sorted = [...items].sort((a, b) => {
        if (a.page !== b.page)
            return a.page - b.page;
        const yDiff = a.bbox.y0 - b.bbox.y0;
        if (Math.abs(yDiff) > 3)
            return yDiff;
        return a.bbox.x0 - b.bbox.x0;
    });
    const headings = [];
    let i = 0;
    for (const item of sorted) {
        const text = item.text.trim();
        if (!text) {
            i++;
            continue;
        }
        if (isLikelyHeading(item, avgFontSize)) {
            const canonical = normalizeHeading(text);
            if (canonical) {
                // Avoid duplicate consecutive headings
                if (headings.length === 0 || headings[headings.length - 1].canonical !== canonical) {
                    headings.push({
                        index: i,
                        canonical,
                        rawHeading: text,
                        page: item.page,
                        y: item.bbox.y0,
                    });
                }
            }
        }
        i++;
    }
    if (headings.length === 0) {
        // No sections detected - treat whole text as unlabeled
        return [{
                name: "unlabeled",
                rawHeading: "",
                text: fullText,
                startPage: 1,
                confidence: 0.5,
            }];
    }
    // Build sections from text between heading markers
    const sections = [];
    const lines = fullText.split("\n");
    for (let hi = 0; hi < headings.length; hi++) {
        const heading = headings[hi];
        const nextHeading = headings[hi + 1];
        // Find all text between this heading and the next
        // Use the sorted items for this
        const startIdx = heading.index;
        const endIdx = nextHeading ? nextHeading.index : sorted.length;
        const sectionItems = sorted.slice(startIdx + 1, endIdx);
        const sectionText = sectionItems.map((si) => si.text).join(" ").trim();
        sections.push({
            name: heading.canonical,
            rawHeading: heading.rawHeading,
            text: sectionText,
            startPage: heading.page,
            confidence: 0.85,
        });
    }
    return sections;
}
/**
 * Extract contact entities from text using regex patterns
 */
function extractEntities(text, sections) {
    // Email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    // Phone (various formats)
    const phoneMatch = text.match(/(?:\+?[\d\s\-().]{7,15}(?:ext\.?\s?\d+)?)/);
    // LinkedIn, GitHub URLs
    const urlMatches = [...text.matchAll(/https?:\/\/[^\s]+|(?:linkedin|github|portfolio)\.com\/[^\s]+/gi)];
    // Name: usually the first non-contact line in the text
    const nameMatch = extractName(text);
    // Skills from skills section
    const skillsSection = sections.find((s) => s.name === "skills");
    const skills = skillsSection ? extractSkillsList(skillsSection.text) : [];
    // Experience
    const expSection = sections.find((s) => s.name === "experience");
    const experience = expSection ? extractExperienceEntries(expSection.text) : [];
    // Education
    const eduSection = sections.find((s) => s.name === "education");
    const education = eduSection ? extractEducationEntries(eduSection.text) : [];
    return {
        name: {
            value: nameMatch,
            confidence: nameMatch ? 0.8 : 0.0,
            sourceBbox: null,
        },
        email: {
            value: emailMatch ? emailMatch[0] : "",
            confidence: emailMatch ? 0.95 : 0.0,
        },
        phone: {
            value: phoneMatch ? phoneMatch[0].trim() : "",
            confidence: phoneMatch ? 0.75 : 0.0,
        },
        links: urlMatches.map((m) => m[0]).slice(0, 10),
        experience,
        education,
        skills,
    };
}
function extractName(text) {
    // The name is usually in the first 3 lines, not containing @ or digits-heavy
    const lines = text.split("\n").slice(0, 5);
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 1 &&
            trimmed.length < 60 &&
            !trimmed.includes("@") &&
            !/^\d/.test(trimmed) &&
            !/^(http|www)/i.test(trimmed) &&
            !/^(resume|curriculum|cv)\b/i.test(trimmed) &&
            // Looks like a name: 2-4 words, mostly letters
            /^[A-Za-z][A-Za-z\s\-'.]{2,50}$/.test(trimmed)) {
            return trimmed;
        }
    }
    return "";
}
function extractSkillsList(text) {
    // Skills are usually comma-separated or newline-separated
    const skills = text
        .replace(/[•·▪▸→\-–-]/g, ",")
        .split(/[,\n|]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 50);
    return [...new Set(skills)];
}
function extractExperienceEntries(text) {
    // Simple extraction: split by date patterns or company-like lines
    const entries = [];
    const datePattern = /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[-–-to]+\s*(present|current|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})/gi;
    let match;
    const positions = [];
    while ((match = datePattern.exec(text)) !== null) {
        positions.push(match.index);
    }
    if (positions.length === 0) {
        // Can't parse, return raw text as single entry
        return [{
                company: "",
                title: "",
                start: "",
                end: "",
                bullets: text.split("\n").filter((l) => l.trim()).slice(0, 5),
                confidence: 0.3,
            }];
    }
    return entries;
}
function extractEducationEntries(text) {
    const degreePattern = /(?:B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|Ph\.?D\.?|MBA|Bachelor|Master|Associate|Doctor)/gi;
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const degrees = [...text.matchAll(degreePattern)].map((m) => m[0]);
    const years = [...text.matchAll(yearPattern)].map((m) => m[0]);
    if (degrees.length === 0)
        return [];
    return [{
            institution: "",
            degree: degrees[0] || "",
            field: "",
            year: years[years.length - 1] || "",
            confidence: 0.6,
        }];
}
