// ============================================================
// Engine Index — Main parse() and analyze() interface
// PRD §4: "parse(file) → ParseResult, analyze(parse, jd) → Analysis"
// ============================================================

import { extractPDFText, detectMultiColumn, detectHeaderFooterItems, PARSER_VERSION } from "./pdf-extractor";
import { extractDOCXText } from "./docx-extractor";
import { reconstructReadingOrder } from "./reading-order";
import { detectSections, extractEntities } from "./section-detector";
import { runRules } from "./rule-engine";
import { extractJDRequirements, matchKeywords } from "./keyword-matcher";
import { computeScore } from "./scorer";
import type { ParseResult, AnalysisResponse, LostRegion } from "./types";

const ENGINE_VERSION = "1.0.0-phase1";

/**
 * Detect file type from buffer magic bytes.
 */
function detectFileType(buffer: Buffer): "pdf" | "docx" | "unknown" {
  // PDF magic bytes: %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "pdf";
  }
  // DOCX magic bytes: PK (zip archive - Office Open XML)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    // Further check: could be docx/xlsx/pptx — check content type
    // We'll rely on the API route to also pass MIME type for disambiguation
    return "docx";
  }
  return "unknown";
}

/**
 * Parse a resume file buffer and return structured parse results.
 * Accepts PDF or DOCX, max 5MB enforced by the route handler.
 */
export async function parse(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ParseResult> {
  // Validate size (5MB max — PRD §6.1)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    throw new Error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB. Maximum is 5MB.`);
  }

  // Determine file type
  const isPDF =
    mimeType === "application/pdf" ||
    filename.toLowerCase().endsWith(".pdf") ||
    detectFileType(buffer) === "pdf";
  const isDOCX =
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.toLowerCase().endsWith(".docx");

  if (!isPDF && !isDOCX) {
    throw new Error("Unsupported file type. Please upload a PDF or DOCX file.");
  }

  const fileType: "pdf" | "docx" = isPDF ? "pdf" : "docx";

  // ─── Extract raw text items ──────────────────────────────────
  let textItems: any[];
  let pageCount = 1;
  let warnings: any[] = [];
  let isImageOnly = false;
  let hasTable = false;
  let rawText = "";

  if (isPDF) {
    const pdfData = await extractPDFText(buffer);
    textItems = pdfData.textItems;
    pageCount = pdfData.pageCount;
    warnings = pdfData.warnings;
    isImageOnly = pdfData.isImageOnly;
  } else {
    const docxData = await extractDOCXText(buffer);
    textItems = docxData.textItems;
    warnings = docxData.warnings;
    hasTable = docxData.hasTable;
    rawText = docxData.rawText;
    pageCount = Math.ceil(rawText.length / 3000); // rough estimate
  }

  // ─── Multi-column and header/footer detection ─────────────────
  const isMultiColumn = isPDF ? detectMultiColumn(textItems) : false;
  const { headerItems, footerItems } = detectHeaderFooterItems(textItems);
  const hasHeaderFooterContent = headerItems.length > 0 || footerItems.length > 0;

  // Mark header/footer items as lost regions
  const lostRegions: LostRegion[] = [];
  for (const item of headerItems) {
    lostRegions.push({
      page: item.page,
      bbox: item.bbox,
      reason: "text_in_header",
      text: item.text,
    });
  }
  for (const item of footerItems) {
    lostRegions.push({
      page: item.page,
      bbox: item.bbox,
      reason: "text_in_footer",
      text: item.text,
    });
  }

  // ─── Reading order reconstruction ────────────────────────────
  const { atsOrder, bestEffortOrder, lostRegions: readingOrderLost } =
    reconstructReadingOrder(textItems, isMultiColumn);
  lostRegions.push(...readingOrderLost);

  const fullText = isPDF ? atsOrder : rawText;

  // ─── Section detection ────────────────────────────────────────
  const sections = detectSections(textItems, fullText);

  // ─── Entity extraction ────────────────────────────────────────
  const entities = extractEntities(fullText, sections);

  return {
    fileType,
    pageCount,
    readingOrderText: isPDF ? atsOrder : rawText,
    bestEffortText: isPDF ? bestEffortOrder : rawText,
    sections,
    entities,
    lostRegions,
    warnings,
    isImageOnly,
    isMultiColumn,
    hasHeaderFooterContent: hasHeaderFooterContent || hasTable,
    parserVersion: PARSER_VERSION,
  };
}

/**
 * Run the full analysis: rules + keyword matching + scoring.
 */
export async function analyze(
  parseResult: ParseResult,
  jdText: string | null
): Promise<AnalysisResponse> {
  // Run rule engine
  const rules = runRules(parseResult);

  // Run keyword matching if JD provided
  let keywordReport = null;
  if (jdText && jdText.trim().length > 20) {
    const jdRequirements = extractJDRequirements(jdText);
    if (jdRequirements.length > 0) {
      keywordReport = matchKeywords(jdRequirements, parseResult);
    }
  }

  // Compute score
  const scoreBreakdown = computeScore(parseResult, rules, keywordReport);

  return {
    parseResult,
    rules,
    keywordReport,
    scoreBreakdown,
    engineVersion: ENGINE_VERSION,
  };
}
