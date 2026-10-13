// ============================================================
// Shared Types for Frontend - mirrors backend engine/types.ts
// ============================================================

export type Severity = "critical" | "warning" | "info";
export type KeywordPlacement = "bullet_with_context" | "projects_context" | "skills_list_only" | "missing";

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
  experience: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
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
  location?: { page: number; bbox?: { x0: number; y0: number; x1: number; y1: number } };
}

export interface KeywordMatch {
  keyword: string;
  normalized: string;
  isRequired: boolean;
  isSoft?: boolean;
  matched: boolean;
  placement: KeywordPlacement;
  context?: string;
  evidenceBullet?: string;
  tier?: "required" | "strong_signal" | "soft";
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
  scoreFormula: string;
}

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
  score: number;
  verdict: string;
  quirks: VendorQuirk[];
}

export interface BooleanQueryResult {
  query: string;
  surfaced: boolean;
  matchedTerms: string[];
  missingTerms: string[];
  excludedMatches: string[];
  explanation: string;
}

export interface AnalysisResponse {
  parseResult: ParseResult;
  rules: RuleResult[];
  keywordReport: KeywordReport | null;
  scoreBreakdown: ScoreBreakdown;
  engineVersion: string;
  vendorReports?: VendorProfileReport[];
  meta: {
    parseTimeMs: number;
    totalTimeMs: number;
    filename: string;
    fileSize: number;
  };
}

export interface LinkedInAuditResult {
  profile: {
    name: string;
    headline: string;
    about: string;
    location: string;
    currentCompany: string;
    vanityHandle: string;
    isCustomVanityUrl: boolean;
    targetRole: string;
  };
  overallScore: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  verdict: string;
  metrics: {
    headlineScore: number;
    aboutScore: number;
    experienceScore: number;
    skillsScore: number;
    seoVisibilityScore: number;
  };
  headlineAudit: {
    score: number;
    charCount: number;
    idealCharRange: string;
    issues: string[];
    strengths: string[];
    aiSuggestions: {
      formula: string;
      text: string;
      rationale: string;
    }[];
  };
  aboutAudit: {
    score: number;
    wordCount: number;
    hasFirstPersonVoice: boolean;
    hasMetrics: boolean;
    hasCallToAction: boolean;
    issues: string[];
    strengths: string[];
    aiRewrite: {
      hook: string;
      story: string;
      skillsHighlight: string;
      cta: string;
      fullText: string;
    };
  };
  experienceAudit: {
    score: number;
    bulletCount: number;
    quantifiedBulletsRatio: number;
    actionVerbCount: number;
    issues: string[];
    strengths: string[];
  };
  skillsAudit: {
    score: number;
    detectedSkills: string[];
    topPinnedRecommended: string[];
    missingHighDemandSkills: string[];
  };
  visibilityAudit: {
    score: number;
    vanityUrlStatus: "optimized" | "default_numbers";
    recruiterIndexability: "high" | "medium" | "low";
    easyApplySafety: "safe" | "warning";
    checklist: {
      item: string;
      passed: boolean;
      tip: string;
    }[];
  };
  recruiterView: {
    simulatedCard: {
      name: string;
      headline: string;
      location: string;
      company: string;
      matchedSkills: string[];
      openToWorkSimulated: boolean;
    };
    inmailProbability: string;
    searchTierStanding: string;
  };
  viralShare: {
    shareText: string;
    linkedinShareUrl: string;
    twitterShareUrl: string;
  };
}

export type AnalysisState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "analyzing" }
  | { status: "done"; data: AnalysisResponse }
  | { status: "error"; message: string };
