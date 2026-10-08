// ============================================================
// ATS Checker Engine — Shared Types
// These types mirror the JSON shapes in PRD §5.2
// ============================================================

export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TextItem {
  text: string;
  page: number;
  bbox: BBox;
  fontSize: number;
  fontName: string;
  isBold: boolean;
}

export type LostReason =
  | "text_in_header"
  | "text_in_footer"
  | "image_only"
  | "table_scramble"
  | "column_merge"
  | "icon_font"
  | "ocr_low_conf"
  | "multi_column";

export interface LostRegion {
  page: number;
  bbox: BBox;
  reason: LostReason;
  text?: string;
}

// Entities extracted from the resume
export interface ExtractedName {
  value: string;
  confidence: number;
  sourceBbox: BBox | null;
}

export interface ExtractedField {
  value: string;
  confidence: number;
}

export interface ExperienceEntry {
  company: string;
  title: string;
  start: string;
  end: string;
  bullets: string[];
  confidence: number;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  year: string;
  confidence: number;
}

export interface ExtractedEntities {
  name: ExtractedName;
  email: ExtractedField;
  phone: ExtractedField;
  links: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
}

export interface Section {
  name: string;         // canonical name e.g. "experience"
  rawHeading: string;   // what was actually in the resume
  text: string;         // full text of this section
  startPage: number;
  confidence: number;
}

export interface ParseWarning {
  type: string;
  message: string;
  page?: number;
}

export type ParsabilityRisk = "high" | "medium" | "low" | "none";

export interface ParseResult {
  fileType: "pdf" | "docx";
  pageCount: number;
  readingOrderText: string;         // ATS reading order (possibly scrambled for multi-col)
  bestEffortText: string;           // best-effort correct order
  sections: Section[];
  entities: ExtractedEntities;
  lostRegions: LostRegion[];
  warnings: ParseWarning[];
  isImageOnly: boolean;
  isMultiColumn: boolean;
  hasHeaderFooterContent: boolean;
  parserVersion: string;
  // Gap 3: ATS parsability risk
  parsabilityRisk: ParsabilityRisk;
  parsabilityReason: string;        // human-readable explanation
  textItemCount: number;            // raw count of extracted text items
  textToPageRatio: number;          // items per page (< 30 = suspicious)
}

// ============================================================
// Rule Engine Types
// ============================================================

export type Severity = "critical" | "warning" | "info";

export interface RuleResult {
  id: string;
  severity: Severity;
  message: string;
  explanation: string;
  fix: string;
  pointsLost: number;
  location?: { page: number; bbox?: BBox };
}

// ============================================================
// Keyword Matching Types
// ============================================================

export interface JDRequirement {
  keyword: string;
  normalized: string;
  isRequired: boolean;
  isSoft: boolean;           // true = tech list prefixed "you don't need to know all"
  frequency: number;
  tier: "required" | "strong_signal" | "soft";
  context?: string;          // the JD line where this was extracted
}

export type KeywordPlacement =
  | "bullet_with_context"   // in experience bullets — strongest signal
  | "projects_context"      // in projects section — context signal
  | "skills_list_only"      // only in skills list — weaker signal
  | "missing";              // not found

export interface KeywordMatch {
  keyword: string;
  normalized: string;
  isRequired: boolean;
  isSoft?: boolean;
  matched: boolean;
  placement: KeywordPlacement;
  context?: string;            // evidence snippet from resume
  evidenceBullet?: string;     // the actual bullet line
  tier?: "required" | "strong_signal" | "soft";
  aliases?: string[];
}

export interface KeywordReport {
  matched: KeywordMatch[];
  missing: KeywordMatch[];
  matchRate: number;          // 0-100
  requiredMatchRate: number;  // 0-100
  niceToHaveMatchRate: number;
  // Gap 2: semantic matches (added in Phase 2)
  semanticMatches?: {
    jdKeyword: string;
    resumeTerm: string;
    similarity: number;
  }[];
  semanticMatchRate?: number;
}

// ============================================================
// Score Breakdown
// ============================================================

export interface ScoreCategory {
  name: string;
  score: number;       // 0-100
  weight: number;      // 0-1, must sum to 1 across categories used
  items: {
    description: string;
    pointsLost: number;
    severity: Severity;
    fix: string;
  }[];
}

export interface ScoreBreakdown {
  overall: number;             // 0-100, deterministic weighted avg
  parseIntegrity: ScoreCategory;
  bulletQuality: ScoreCategory;
  formattingRisks: ScoreCategory;
  keywordCoverage?: ScoreCategory;   // only when JD present
  experienceRelevance?: ScoreCategory; // only when JD present
  hasJD: boolean;
  estimatedLabel: string;
  scoreFormula: string;        // human-readable formula showing the weights used
}

// ============================================================
// Full Analysis Response
// ============================================================

export interface AnalysisResponse {
  parseResult: ParseResult;
  rules: RuleResult[];
  keywordReport: KeywordReport | null;
  scoreBreakdown: ScoreBreakdown;
  engineVersion: string;
}
