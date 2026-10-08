// ============================================================
// Keyword Matcher v2
// PRD §6.5: JD keyword extraction with alias taxonomy + tiering
//
// Fixes in v2:
// - Extract keywords from REQUIREMENT-CONTEXT lines only
//   (tech list section prefixed "You don't need to know all" → soft/nice-to-have)
// - Treat "Node.js" as ONE token, not "node" + "js"
// - "go"/"Go" only matches Golang context — not "GoComet", "going", "to go"
// - Strip company name boilerplate from extraction
// - Tier by JD headings: non-negotiables > strong signals > tech list (soft)
// - Alias taxonomy: LangGraph, RAG, agents → match "Applied AI/LLMs" semantically
// - Show evidence snippets bounded to the actual bullet, not a section dump
// ============================================================

import type { KeywordReport, KeywordMatch, JDRequirement, KeywordPlacement } from "./types.js";
import type { ParseResult } from "./types.js";

// ─── Alias taxonomy ─────────────────────────────────────────────
// Maps canonical skill → [exact aliases that count as a match]
// Each alias is matched as a WHOLE WORD (not substring).
const ALIAS_MAP: Record<string, string[]> = {
  "javascript":    ["javascript", "js", "ecmascript", "es6", "es2015", "es2020"],
  "typescript":    ["typescript", "ts"],
  "python":        ["python", "python3"],
  "react":         ["react", "reactjs", "react.js"],
  "react native":  ["react native", "react-native"],
  "node.js":       ["node.js", "nodejs"],    // "node" alone NOT in list — prevents "node" matching "Node16"
  "next.js":       ["next.js", "nextjs"],
  "vue":           ["vue", "vuejs", "vue.js"],
  "angular":       ["angular", "angularjs"],
  "kubernetes":    ["kubernetes", "k8s"],
  "docker":        ["docker"],
  "aws":           ["aws", "amazon web services"],
  "gcp":           ["gcp", "google cloud", "google cloud platform"],
  "azure":         ["azure", "microsoft azure"],
  "postgresql":    ["postgresql", "postgres"],
  "mongodb":       ["mongodb", "mongo"],
  "redis":         ["redis"],
  "graphql":       ["graphql", "gql"],
  "rest api":      ["rest api", "restful", "restful api"],
  "git":           ["git", "github", "gitlab"],
  "java":          ["java"],
  "c++":           ["c++", "cpp"],
  "c#":            ["c#", "csharp", ".net"],
  // "go"/"golang" — must be bounded by start/end of word AND context-filtered
  "golang":        ["golang", "go"],   // matched with extra guard (see matchGolang)
  "rust":          ["rust"],
  "sql":           ["sql", "mysql", "mssql"],
  "html":          ["html", "html5"],
  "css":           ["css", "scss", "sass"],
  "fastify":       ["fastify"],
  "express":       ["express", "expressjs"],
  "tensorflow":    ["tensorflow"],
  "pytorch":       ["pytorch"],
  "machine learning": ["machine learning"],
  "deep learning": ["deep learning"],
  "devops":        ["devops"],
  "ci/cd":         ["ci/cd", "cicd", "continuous integration"],
  "agile":         ["agile", "scrum", "kanban"],
  "linux":         ["linux", "unix", "ubuntu"],
  "swift":         ["swift"],
  "kotlin":        ["kotlin"],
  "flutter":       ["flutter"],
  "scala":         ["scala"],
  "php":           ["php"],
  "ruby":          ["ruby", "rails"],
  "kafka":         ["kafka"],
  "clickhouse":    ["clickhouse"],
  "langgraph":     ["langgraph"],
  "fastapi":       ["fastapi"],
  "langchain":     ["langchain"],
  "weaviate":      ["weaviate"],
  "rag":           ["rag"],            // retrieval-augmented generation
  "llm":           ["llm", "llms", "large language model"],
  "applied ai":    ["applied ai", "applied ai/llms", "ai/llms"],
  "agent":         ["agent", "agents", "agentic"],
  "prisma":        ["prisma"],
  "drizzle":       ["drizzle"],
  "supabase":      ["supabase"],
  "vercel":        ["vercel"],
  "terraform":     ["terraform"],
  "datadog":       ["datadog"],
  "opentelemetry": ["opentelemetry"],
  "figma":         ["figma"],
};

// Semantic groups: if JD mentions these, match resume's broader category
// e.g. "LangGraph" in JD → also match "Applied AI/LLMs", "agents", "LLM" in resume
const SEMANTIC_GROUPS: Record<string, string[]> = {
  "applied ai":    ["langgraph", "llm", "rag", "agent", "applied ai", "langchain"],
  "langgraph":     ["applied ai", "llm", "agent", "rag", "langchain"],
  "rag":           ["applied ai", "llm", "agent", "langchain"],
  "llm":           ["applied ai", "rag", "agent", "langgraph", "langchain"],
  "agent":         ["applied ai", "llm", "rag", "langgraph"],
  "kafka":         ["event streaming", "event pipeline", "kafka"],
  "clickhouse":    ["clickhouse", "analytical store", "olap"],
};

// Build reverse lookup: alias → canonical
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), canonical);
  }
}

// ─── Section tier detection from JD text ─────────────────────────
// Returns "required" | "strong_signal" | "soft" based on the heading/context
// above a given line in the JD.
function getJDTier(jdLines: string[], lineIdx: number): "required" | "strong_signal" | "soft" {
  // Look back up to 20 lines for the nearest section header
  for (let i = lineIdx; i >= Math.max(0, lineIdx - 20); i--) {
    const l = jdLines[i].trim().toLowerCase();
    if (l.includes("non-negotiable") || l.includes("you can code") || l.includes("you will") || l.includes("must have") || l.includes("required")) return "required";
    if (l.includes("strong signal") || l.includes("you've built") || l.includes("you default") || l.includes("preferred")) return "strong_signal";
    if (l.includes("you don't need to know") || l.includes("don't need to know") || l.includes("nice to have") || l.includes("tech you'll work with") || l.includes("tech list")) return "soft";
    if (l.includes("what you'll actually do") || l.includes("what we're looking for")) return "required";
  }
  return "strong_signal"; // default
}

// ─── Golang guard ────────────────────────────────────────────────
// "go" must appear as a standalone programming language mention,
// not inside a word (GoComet, going, go-live, ago, etc.)
function isGolangMention(line: string, match: string): boolean {
  if (match.toLowerCase() === "golang") return true;
  // "Go" — must be standalone word with programming context nearby
  const idx = line.toLowerCase().indexOf("go");
  if (idx < 0) return false;
  // Check it's a whole word
  const before = idx > 0 ? line[idx - 1] : " ";
  const after  = idx + 2 < line.length ? line[idx + 2] : " ";
  if (/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after)) return false;
  // Must appear in a tech-list context (comma-separated, or after "language" keyword)
  return /python|node|rust|java|backend|language|stack/i.test(line);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── JD boilerplate / company-name stripping ─────────────────────
// Lines that are about the company culture/branding, not tech requirements.
// We skip keyword extraction from these lines.
const BOILERPLATE_PATTERNS = [
  /about\s+(gocomet|our company|us|the company)/i,
  /moves\s+\$\d+\s+trillion/i,
  /supply chain visibility/i,
  /30\+\s+countries/i,
  /most of it still runs on/i,
  /logistics moves/i,
  /we're fixing that/i,
  /nova platform/i,
  /founding team/i,
  /your fingerprints/i,
  /what this role is not/i,
  /why this is different/i,
];

function isBoilerplateLine(line: string): boolean {
  return BOILERPLATE_PATTERNS.some((p) => p.test(line));
}

// ─── Main JD requirement extractor ────────────────────────────────
export function extractJDRequirements(jdText: string): JDRequirement[] {
  const jdLines = jdText.split("\n");
  const requirements: JDRequirement[] = [];
  const seen = new Set<string>();

  for (let lineIdx = 0; lineIdx < jdLines.length; lineIdx++) {
    const line = jdLines[lineIdx];
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;
    if (isBoilerplateLine(trimmed)) continue;

    const tier = getJDTier(jdLines, lineIdx);

    for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
      if (seen.has(canonical)) continue;

      for (const alias of aliases) {
        // Special handling for "go"/"golang"
        if ((alias === "go" || canonical === "golang") && alias !== "golang") {
          const regex = new RegExp(`\\bgo\\b`, "i");
          if (regex.test(trimmed) && isGolangMention(trimmed, "go")) {
            seen.add(canonical);
            requirements.push({
              keyword: "Go / Golang",
              normalized: canonical,
              isRequired: tier === "required",
              isSoft: tier === "soft",
              frequency: 1,
              tier,
              context: trimmed,
            });
            break;
          }
          continue;
        }

        // Multi-word aliases need phrase matching
        const regex = alias.includes(" ")
          ? new RegExp(`(?:^|[^A-Za-z0-9])${escapeRegex(alias)}(?:[^A-Za-z0-9]|$)`, "i")
          : new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");

        if (regex.test(trimmed)) {
          const frequency = (jdText.match(new RegExp(escapeRegex(alias), "gi")) || []).length;
          seen.add(canonical);
          requirements.push({
            keyword: alias,
            normalized: canonical,
            isRequired: tier === "required" || (tier === "strong_signal" && frequency >= 2),
            isSoft: tier === "soft",
            frequency,
            tier,
            context: trimmed,
          });
          break;
        }
      }
    }
  }

  return requirements;
}

// ─── Placement checker ────────────────────────────────────────────
// Finds WHERE a keyword appears in the resume and returns the actual evidence snippet.
function checkPlacement(
  canonical: string,
  aliases: string[],
  parseResult: ParseResult
): { placement: KeywordPlacement; context: string; evidenceBullet?: string } {

  const allPatterns = aliases
    .filter((a) => a !== "go")  // "go" handled separately
    .map((a) => ({
      pattern: a.includes(" ")
        ? new RegExp(`(?:^|[^A-Za-z0-9])${escapeRegex(a)}(?:[^A-Za-z0-9]|$)`, "i")
        : new RegExp(`\\b${escapeRegex(a)}\\b`, "i"),
      alias: a,
    }));

  // Also check semantic group matches
  const semanticAliases = SEMANTIC_GROUPS[canonical] || [];
  for (const sem of semanticAliases) {
    const semAliases = ALIAS_MAP[sem] || [sem];
    for (const sa of semAliases) {
      allPatterns.push({
        pattern: new RegExp(`\\b${escapeRegex(sa)}\\b`, "i"),
        alias: sa,
      });
    }
  }

  const expSection = parseResult.sections.find((s) => s.name === "experience");
  const projectsSection = parseResult.sections.find((s) => s.name === "projects");
  const skillsSection  = parseResult.sections.find((s) => s.name === "skills");

  // Check experience bullets (best)
  if (expSection) {
    const bullets = expSection.text.split("\n").filter((l) => /^[\-–•*▸→]/.test(l.trim()) || l.trim().startsWith("–"));
    for (const bullet of bullets) {
      for (const { pattern } of allPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(bullet)) {
          const snippet = bullet.trim().slice(0, 140);
          return { placement: "bullet_with_context", context: snippet, evidenceBullet: snippet };
        }
      }
    }
    // Check experience body (not just bullets)
    for (const { pattern } of allPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(expSection.text)) {
        const idx = expSection.text.search(pattern);
        const snippet = expSection.text.slice(Math.max(0, idx - 20), idx + 100).trim();
        return { placement: "bullet_with_context", context: snippet };
      }
    }
  }

  // Check projects section (counts but at lower weight — signals context)
  if (projectsSection) {
    for (const { pattern } of allPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(projectsSection.text)) {
        const idx = projectsSection.text.search(pattern);
        const snippet = projectsSection.text.slice(Math.max(0, idx - 20), idx + 100).trim();
        return { placement: "projects_context", context: snippet };
      }
    }
  }

  // Check skills section
  if (skillsSection) {
    for (const { pattern } of allPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(skillsSection.text)) {
        return { placement: "skills_list_only", context: "Listed in Technical Skills" };
      }
    }
  }

  // Anywhere else
  for (const { pattern } of allPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(parseResult.readingOrderText)) {
      return { placement: "skills_list_only", context: "Found in resume text" };
    }
  }

  return { placement: "missing", context: "" };
}

// ─── Main keyword match function ─────────────────────────────────
export function matchKeywords(
  jdRequirements: JDRequirement[],
  parseResult: ParseResult
): KeywordReport {
  const matched: KeywordMatch[] = [];
  const missing: KeywordMatch[] = [];

  for (const req of jdRequirements) {
    // Skip soft/nice-to-have items that say "you don't need to know on day one"
    // We still report them but mark as non-required
    const aliases = ALIAS_MAP[req.normalized] || [req.keyword];
    const { placement, context, evidenceBullet } = checkPlacement(req.normalized, aliases, parseResult);

    const isMatch = placement !== "missing";
    const match: KeywordMatch = {
      keyword: req.keyword,
      normalized: req.normalized,
      isRequired: req.isRequired && !req.isSoft,
      matched: isMatch,
      placement,
      context: context || undefined,
      evidenceBullet,
      tier: req.tier,
      isSoft: req.isSoft,
      aliases: aliases.length > 1 ? aliases : undefined,
    };

    if (isMatch) {
      matched.push(match);
    } else {
      missing.push(match);
    }
  }

  const nonSoftRequirements = jdRequirements.filter((r) => !r.isSoft);
  const total = nonSoftRequirements.length;
  const matchCount = matched.filter((m) => !m.isSoft).length;

  const requiredReqs = nonSoftRequirements.filter((r) => r.isRequired);
  const requiredTotal = requiredReqs.length;
  const requiredMatched = matched.filter((m) => m.isRequired && !m.isSoft).length;

  const niceTotal = total - requiredTotal;
  const niceMatched = matchCount - requiredMatched;

  return {
    matched,
    missing,
    matchRate: total > 0 ? Math.round((matchCount / total) * 100) : 0,
    requiredMatchRate: requiredTotal > 0 ? Math.round((requiredMatched / requiredTotal) * 100) : 0,
    niceToHaveMatchRate: niceTotal > 0 ? Math.round((niceMatched / niceTotal) * 100) : 0,
  };
}
