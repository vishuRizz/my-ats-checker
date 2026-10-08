// ============================================================
// Engine Index — Main parse() and analyze() interface
// PRD §4: "parse(file) → ParseResult, analyze(parse, jd) → Analysis"
// ============================================================

import { extractPDFText, detectMultiColumn, detectHeaderFooterItems, PARSER_VERSION } from "./pdf-extractor.js";
import { extractDOCXText } from "./docx-extractor.js";
import { reconstructReadingOrder } from "./reading-order.js";
import { detectSections, extractEntities } from "./section-detector.js";
import { runRules } from "./rule-engine.js";
import { extractJDRequirements, matchKeywords } from "./keyword-matcher.js";
import { computeScore } from "./scorer.js";
import type { ParseResult, AnalysisResponse, LostRegion } from "./types.js";

const ENGINE_VERSION = "1.0.1-phase1";

function detectFileType(buffer: Buffer): "pdf" | "docx" | "unknown" {
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return "pdf";
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return "docx";
  return "unknown";
}

export async function parse(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ParseResult> {
  const MAX_SIZE = 5 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    throw new Error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB. Maximum is 5MB.`);
  }

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

  let textItems: any[] = [];
  let pageCount = 1;
  let pageWidths: number[] = [];
  let pageHeights: number[] = [];
  let warnings: any[] = [];
  let isImageOnly = false;
  let hasTable = false;
  let rawText = "";
  let links: { url: string; label: string; page: number }[] = [];

  if (isPDF) {
    const pdfData = await extractPDFText(buffer);
    textItems    = pdfData.textItems;
    pageCount    = pdfData.pageCount;
    pageWidths   = pdfData.pageWidths;
    pageHeights  = pdfData.pageHeights;
    warnings     = pdfData.warnings;
    isImageOnly  = pdfData.isImageOnly;
    links        = pdfData.links;
  } else {
    const docxData = await extractDOCXText(buffer);
    textItems = docxData.textItems;
    warnings  = docxData.warnings;
    hasTable  = docxData.hasTable;
    rawText   = docxData.rawText;
    pageCount = Math.ceil(rawText.length / 3000);
  }

  // Use actual page width from PDF (or default 612 pt = US Letter)
  const pageWidth = pageWidths[0] ?? 612;

  // ── Multi-column detection ────────────────────────────────────
  const isMultiColumn = isPDF
    ? detectMultiColumn(textItems, pageWidth, pageCount)
    : false;

  // ── Header/footer detection (multi-page only) ─────────────────
  const { headerItems, footerItems } = detectHeaderFooterItems(
    textItems,
    pageHeights.length > 0 ? pageHeights : [840],
    pageCount
  );
  const hasHeaderFooterContent = headerItems.length > 0 || footerItems.length > 0;

  const lostRegions: LostRegion[] = [];
  for (const item of headerItems) {
    lostRegions.push({ page: item.page, bbox: item.bbox, reason: "text_in_header", text: item.text });
  }
  for (const item of footerItems) {
    lostRegions.push({ page: item.page, bbox: item.bbox, reason: "text_in_footer", text: item.text });
  }

  // ── Reading order ─────────────────────────────────────────────
  const { atsOrder, bestEffortOrder, lostRegions: readingOrderLost } =
    reconstructReadingOrder(textItems, isMultiColumn, pageWidth);
  lostRegions.push(...readingOrderLost);

  const fullText = isPDF ? atsOrder : rawText;

  // ── Section detection ─────────────────────────────────────────
  const sections = detectSections(textItems, fullText);

  // ── Entity extraction ─────────────────────────────────────────
  // Merge PDF link annotations into entity links
  const entities = extractEntities(fullText, sections);
  // Add PDF annotation links (these are more reliable than URL-regex from text)
  if (links.length > 0) {
    const annotationUrls = links.map((l) => l.label !== l.url ? `${l.label}: ${l.url}` : l.url);
    // Merge: annotation links take priority, then text-extracted links
    const existing = new Set(entities.links.map((l) => l.toLowerCase()));
    for (const u of annotationUrls) {
      if (!existing.has(u.toLowerCase())) entities.links.push(u);
    }
    // Also store raw annotation links for display
    (entities as any).linkAnnotations = links;
  }

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

export async function analyze(
  parseResult: ParseResult,
  jdText: string | null
): Promise<AnalysisResponse> {
  const rules = runRules(parseResult);

  let keywordReport = null;
  if (jdText && jdText.trim().length > 20) {
    const jdRequirements = extractJDRequirements(jdText);
    if (jdRequirements.length > 0) {
      keywordReport = matchKeywords(jdRequirements, parseResult);
    }
  }

  const scoreBreakdown = computeScore(parseResult, rules, keywordReport);

  return {
    parseResult,
    rules,
    keywordReport,
    scoreBreakdown,
    engineVersion: ENGINE_VERSION,
  };
}
