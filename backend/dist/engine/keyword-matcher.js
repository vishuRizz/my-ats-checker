"use strict";
// ============================================================
// Keyword Matcher — Phase 1
// PRD §6.5: Exact keyword match against JD with alias awareness
// Uses a hardcoded alias list (~50 common tech mappings)
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractJDRequirements = extractJDRequirements;
exports.matchKeywords = matchKeywords;
// ─── Alias Map (P1-003: small hardcoded list) ───────────────────
// Maps canonical → [aliases...]. All lowercased.
const ALIAS_MAP = {
    javascript: ["js", "javascript", "ecmascript", "es6", "es2015"],
    typescript: ["ts", "typescript"],
    python: ["python", "python3", "py"],
    react: ["react", "reactjs", "react.js"],
    "react native": ["react native", "rn", "react-native"],
    "node.js": ["node", "nodejs", "node.js"],
    "next.js": ["next", "nextjs", "next.js"],
    vue: ["vue", "vuejs", "vue.js"],
    angular: ["angular", "angularjs"],
    kubernetes: ["kubernetes", "k8s"],
    docker: ["docker", "containerization"],
    aws: ["aws", "amazon web services", "amazon aws"],
    gcp: ["gcp", "google cloud", "google cloud platform"],
    azure: ["azure", "microsoft azure"],
    postgresql: ["postgresql", "postgres", "pg"],
    mongodb: ["mongodb", "mongo"],
    redis: ["redis"],
    graphql: ["graphql", "gql"],
    "rest api": ["rest", "rest api", "restful", "restful api"],
    git: ["git", "github", "gitlab", "bitbucket"],
    java: ["java"],
    "c++": ["c++", "cpp", "c plus plus"],
    "c#": ["c#", "csharp", "c sharp", ".net"],
    go: ["go", "golang"],
    rust: ["rust", "rustlang"],
    sql: ["sql", "mysql", "mssql", "t-sql"],
    html: ["html", "html5"],
    css: ["css", "css3", "scss", "sass", "less"],
    fastify: ["fastify"],
    express: ["express", "expressjs", "express.js"],
    tensorflow: ["tensorflow", "tf"],
    pytorch: ["pytorch", "torch"],
    "machine learning": ["machine learning", "ml"],
    "deep learning": ["deep learning", "dl"],
    devops: ["devops", "dev ops"],
    cicd: ["ci/cd", "ci cd", "cicd", "continuous integration", "continuous deployment"],
    agile: ["agile", "scrum", "kanban", "sprint"],
    "linux/unix": ["linux", "unix", "ubuntu", "debian"],
    swift: ["swift"],
    kotlin: ["kotlin"],
    flutter: ["flutter", "dart"],
    scala: ["scala"],
    php: ["php"],
    ruby: ["ruby", "rails", "ruby on rails"],
    selenium: ["selenium"],
    jest: ["jest", "testing", "unit testing"],
    figma: ["figma"],
    "data analysis": ["data analysis", "data analytics", "analytics"],
    excel: ["excel", "ms excel", "microsoft excel", "spreadsheets"],
    tableau: ["tableau", "data visualization"],
};
// Build reverse lookup: alias → canonical
const ALIAS_TO_CANONICAL = new Map();
for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
    for (const alias of aliases) {
        ALIAS_TO_CANONICAL.set(alias.toLowerCase(), canonical);
    }
}
/**
 * Normalize a keyword to its canonical form using the alias map.
 */
function normalize(keyword) {
    const lower = keyword.toLowerCase().trim();
    return ALIAS_TO_CANONICAL.get(lower) || lower;
}
/**
 * Extract keywords from a job description.
 * Uses simple noun phrase extraction + alias normalization.
 * Classifies required vs nice-to-have based on context words.
 */
function extractJDRequirements(jdText) {
    // Required indicators
    const requiredPatterns = /\b(?:required|must have|must-have|essential|mandatory|needed|need to|you will|you must|we require|requirement|must possess|minimum requirement|required skill)\b/gi;
    // Nice-to-have indicators
    const niceToHavePatterns = /\b(?:preferred|nice to have|nice-to-have|bonus|plus|advantage|desirable|optional|ideally|good to have|familiarity with|exposure to|experience with is a plus)\b/gi;
    const lines = jdText.split("\n");
    const requirements = [];
    const seen = new Set();
    // Parse line by line, look for tech keywords
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 3)
            continue;
        // Determine if this line is in a "required" or "nice-to-have" context
        const isRequiredContext = requiredPatterns.test(trimmed);
        const isNiceToHaveContext = niceToHavePatterns.test(trimmed);
        // Reset regex lastIndex
        requiredPatterns.lastIndex = 0;
        niceToHavePatterns.lastIndex = 0;
        // Extract tech terms: match against alias map
        for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
            for (const alias of aliases) {
                const regex = new RegExp(`\\b${escapeRegex(alias)}\\b`, "gi");
                if (regex.test(trimmed) && !seen.has(canonical)) {
                    seen.add(canonical);
                    // Count frequency across whole JD
                    const globalRegex = new RegExp(`\\b${escapeRegex(alias)}\\b`, "gi");
                    const frequency = (jdText.match(globalRegex) || []).length;
                    requirements.push({
                        keyword: alias,
                        normalized: canonical,
                        isRequired: isRequiredContext || (!isNiceToHaveContext && frequency >= 2),
                        frequency,
                    });
                    break; // Found this canonical, move on
                }
            }
        }
        // Also extract years of experience mentions
        const yearsMatch = trimmed.match(/(\d+)\+?\s+years?\s+(?:of\s+)?(?:experience\s+(?:with|in)\s+)?([A-Za-z][A-Za-z0-9\s.#+]{2,30})/i);
        if (yearsMatch) {
            const tech = yearsMatch[2].trim().toLowerCase();
            const canonical = normalize(tech);
            if (!seen.has(`years_${canonical}`)) {
                seen.add(`years_${canonical}`);
                // We just track this as a context note, not a separate requirement
            }
        }
    }
    return requirements;
}
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Check where a keyword appears in the resume (placement quality).
 */
function checkPlacement(keyword, aliases, parseResult) {
    const expSection = parseResult.sections.find((s) => s.name === "experience");
    const skillsSection = parseResult.sections.find((s) => s.name === "skills");
    const allAliasPatterns = aliases.map((a) => new RegExp(`\\b${escapeRegex(a)}\\b`, "gi"));
    // Check if it appears in a bullet in experience section (best placement)
    if (expSection) {
        const bullets = expSection.text.split("\n").filter((l) => /^[•·▪▸→\-–—*]/.test(l.trim()));
        for (const bullet of bullets) {
            for (const pattern of allAliasPatterns) {
                if (pattern.test(bullet)) {
                    pattern.lastIndex = 0;
                    return { placement: "bullet_with_context", context: bullet.slice(0, 120) };
                }
                pattern.lastIndex = 0;
            }
        }
        // Check if it appears anywhere in experience (not just bullets)
        for (const pattern of allAliasPatterns) {
            if (pattern.test(expSection.text)) {
                pattern.lastIndex = 0;
                const idx = expSection.text.search(pattern);
                const context = expSection.text.slice(Math.max(0, idx - 30), idx + 80);
                return { placement: "bullet_with_context", context };
            }
            pattern.lastIndex = 0;
        }
    }
    // Check skills section
    if (skillsSection) {
        for (const pattern of allAliasPatterns) {
            if (pattern.test(skillsSection.text)) {
                pattern.lastIndex = 0;
                return { placement: "skills_list_only", context: "Listed in skills section" };
            }
            pattern.lastIndex = 0;
        }
    }
    // Check anywhere else in the document
    for (const pattern of allAliasPatterns) {
        if (pattern.test(parseResult.readingOrderText)) {
            pattern.lastIndex = 0;
            return { placement: "skills_list_only", context: "Found in resume text" };
        }
        pattern.lastIndex = 0;
    }
    return { placement: "missing", context: "" };
}
/**
 * Match JD requirements against the parse result.
 */
function matchKeywords(jdRequirements, parseResult) {
    const matches = [];
    const missing = [];
    for (const req of jdRequirements) {
        const aliases = ALIAS_MAP[req.normalized] || [req.keyword];
        const { placement, context } = checkPlacement(req.normalized, aliases, parseResult);
        const match = {
            keyword: req.keyword,
            normalized: req.normalized,
            isRequired: req.isRequired,
            matched: placement !== "missing",
            placement,
            context: context || undefined,
            aliases: aliases.length > 1 ? aliases : undefined,
        };
        if (placement !== "missing") {
            matches.push(match);
        }
        else {
            missing.push(match);
        }
    }
    const total = jdRequirements.length;
    const matchCount = matches.length;
    const requiredTotal = jdRequirements.filter((r) => r.isRequired).length;
    const requiredMatched = matches.filter((m) => m.isRequired).length;
    const niceToHaveTotal = total - requiredTotal;
    const niceToHaveMatched = matchCount - requiredMatched;
    return {
        matched: matches,
        missing: missing,
        matchRate: total > 0 ? Math.round((matchCount / total) * 100) : 0,
        requiredMatchRate: requiredTotal > 0 ? Math.round((requiredMatched / requiredTotal) * 100) : 0,
        niceToHaveMatchRate: niceToHaveTotal > 0 ? Math.round((niceToHaveMatched / niceToHaveTotal) * 100) : 0,
    };
}
