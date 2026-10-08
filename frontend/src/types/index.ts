// ============================================================
// Shared Types for Frontend - mirrors backend engine/types.ts
// ============================================================

export type Severity = "critical" | "warning" | "info";
export type KeywordPlacement = "bullet_with_context" | "skills_list_only" | "missing";

export interface Section {
  name: string;
  rawHeading: string;
  text: string;
  startPage: number;
  confidence: number;
}

export interface ExtractedEntities {
  name: { value: string; confidence: number };
  email: { value: string; confidence: number };
  phone: { value: string; confidence: number };
  links: string[];
  skills: string[];
  experience: any[];
  education: any[];
}

export interface LostRegion {
  page: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  reason: string;
  text?: string;
}

export interface ParseWarning {
  type: string;
  message: string;
  page?: number;
}

export interface ParseResult {
  fileType: "pdf" | "docx";
  pageCount: number;
  readingOrderText: string;
  bestEffortText: string;
  sections: Section[];
  entities: ExtractedEntities;
  lostRegions: LostRegion[];
  warnings: ParseWarning[];
  isImageOnly: boolean;
  isMultiColumn: boolean;
  hasHeaderFooterContent: boolean;
  parserVersion: string;
  // Gap 3
  parsabilityRisk: "high" | "medium" | "low" | "none";
  parsabilityReason: string;
  textItemCount: number;
  textToPageRatio: number;
}

export interface RuleResult {
  id: string;
  severity: Severity;
  message: string;
  explanation: string;
  fix: string;
  pointsLost: number;
  location?: { page: number };
}

export interface KeywordMatch {
  keyword: string;
  normalized: string;
  isRequired: boolean;
  matched: boolean;
  placement: KeywordPlacement;
  context?: string;
  aliases?: string[];
}

export interface KeywordReport {
  matched: KeywordMatch[];
  missing: KeywordMatch[];
  matchRate: number;
  requiredMatchRate: number;
  niceToHaveMatchRate: number;
  // Gap 2 (Phase 2)
  semanticMatches?: { jdKeyword: string; resumeTerm: string; similarity: number }[];
  semanticMatchRate?: number;
}

export interface ScoreCategory {
  name: string;
  score: number;
  weight: number;
  items: {
    description: string;
    pointsLost: number;
    severity: Severity;
    fix: string;
  }[];
}

export interface ScoreBreakdown {
  overall: number;
  parseIntegrity: ScoreCategory;
  bulletQuality: ScoreCategory;
  formattingRisks: ScoreCategory;
  keywordCoverage?: ScoreCategory;
  experienceRelevance?: ScoreCategory;
  hasJD: boolean;
  estimatedLabel: string;
}

export interface AnalysisResponse {
  parseResult: ParseResult;
  rules: RuleResult[];
  keywordReport: KeywordReport | null;
  scoreBreakdown: ScoreBreakdown;
  engineVersion: string;
  meta: {
    parseTimeMs: number;
    totalTimeMs: number;
    filename: string;
    fileSize: number;
    jdText?: string;
  };
}

export type AnalysisState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "analyzing" }
  | { status: "done"; data: AnalysisResponse }
  | { status: "error"; message: string };
