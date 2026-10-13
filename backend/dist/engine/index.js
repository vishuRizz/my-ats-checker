"use strict";
// ============================================================
// Engine Index - Main parse() and analyze() interface
// PRD §4: "parse(file) → ParseResult, analyze(parse, jd) → Analysis"
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
exports.analyze = analyze;
const pdf_extractor_js_1 = require("./pdf-extractor.js");
const docx_extractor_js_1 = require("./docx-extractor.js");
const reading_order_js_1 = require("./reading-order.js");
const section_detector_js_1 = require("./section-detector.js");
const rule_engine_js_1 = require("./rule-engine.js");
const keyword_matcher_js_1 = require("./keyword-matcher.js");
const scorer_js_1 = require("./scorer.js");
const vendor_profiles_js_1 = require("./vendor-profiles.js");
const ENGINE_VERSION = "1.0.1-phase1";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PAGE_COUNT = 10;
function detectFileType(buffer) {
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)
        return "pdf";
    // DOCX is a ZIP archive, but arbitrary ZIP files must not be accepted as resumes.
    if (buffer[0] === 0x50 && buffer[1] === 0x4b &&
        buffer.includes(Buffer.from("[Content_Types].xml")) &&
        buffer.includes(Buffer.from("word/document.xml")))
        return "docx";
    return "unknown";
}
async function parse(buffer, mimeType, filename) {
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB. Maximum is 5MB.`);
    }
    const detectedFileType = detectFileType(buffer);
    const isPDF = detectedFileType === "pdf";
    const isDOCX = detectedFileType === "docx";
    if (!isPDF && !isDOCX) {
        throw new Error("Unsupported or invalid file. Upload a valid PDF or DOCX file.");
    }
    const fileType = isPDF ? "pdf" : "docx";
    let textItems = [];
    let pageCount = 1;
    let pageWidths = [];
    let pageHeights = [];
    let warnings = [];
    let isImageOnly = false;
    let hasTable = false;
    let rawText = "";
    let links = [];
    if (isPDF) {
        const pdfData = await (0, pdf_extractor_js_1.extractPDFText)(buffer, MAX_PAGE_COUNT);
        textItems = pdfData.textItems;
        pageCount = pdfData.pageCount;
        pageWidths = pdfData.pageWidths;
        pageHeights = pdfData.pageHeights;
        warnings = pdfData.warnings;
        isImageOnly = pdfData.isImageOnly;
        links = pdfData.links;
    }
    else {
        const docxData = await (0, docx_extractor_js_1.extractDOCXText)(buffer);
        textItems = docxData.textItems;
        warnings = docxData.warnings;
        hasTable = docxData.hasTable;
        rawText = docxData.rawText;
        if (rawText.length > 200_000) {
            throw new Error("DOCX contains too much text. Please upload a resume with fewer than 200,000 characters.");
        }
        pageCount = Math.ceil(rawText.length / 3000);
    }
    // Use actual page width from PDF (or default 612 pt = US Letter)
    const pageWidth = pageWidths[0] ?? 612;
    // ── Multi-column detection ────────────────────────────────────
    const isMultiColumn = isPDF
        ? (0, pdf_extractor_js_1.detectMultiColumn)(textItems, pageWidth, pageCount)
        : false;
    // ── Header/footer detection (multi-page only) ─────────────────
    const { headerItems, footerItems } = (0, pdf_extractor_js_1.detectHeaderFooterItems)(textItems, pageHeights.length > 0 ? pageHeights : [840], pageCount);
    const hasHeaderFooterContent = headerItems.length > 0 || footerItems.length > 0;
    const lostRegions = [];
    for (const item of headerItems) {
        lostRegions.push({ page: item.page, bbox: item.bbox, reason: "text_in_header", text: item.text });
    }
    for (const item of footerItems) {
        lostRegions.push({ page: item.page, bbox: item.bbox, reason: "text_in_footer", text: item.text });
    }
    // ── Reading order ─────────────────────────────────────────────
    const { atsOrder, bestEffortOrder, lostRegions: readingOrderLost } = (0, reading_order_js_1.reconstructReadingOrder)(textItems, isMultiColumn, pageWidth);
    lostRegions.push(...readingOrderLost);
    const fullText = isPDF ? atsOrder : rawText;
    // ── Section detection ─────────────────────────────────────────
    const sections = (0, section_detector_js_1.detectSections)(textItems, fullText);
    // ── Entity extraction ─────────────────────────────────────────
    // Merge PDF link annotations into entity links
    const entities = (0, section_detector_js_1.extractEntities)(fullText, sections);
    // Add PDF annotation links (these are more reliable than URL-regex from text)
    if (links.length > 0) {
        const annotationUrls = links.map((l) => l.label !== l.url ? `${l.label}: ${l.url}` : l.url);
        // Merge: annotation links take priority, then text-extracted links
        const existing = new Set(entities.links.map((l) => l.toLowerCase()));
        for (const u of annotationUrls) {
            if (!existing.has(u.toLowerCase()))
                entities.links.push(u);
        }
        // Also store raw annotation links for display
        entities.linkAnnotations = links;
    }
    // ── Parsability Risk Assessment (Gap 3) ──────────────────────
    const textItemCount = textItems.length;
    const textToPageRatio = pageCount > 0 ? textItemCount / pageCount : 0;
    const suspiciousName = /canva|design|template|creative|infographic|portfolio/i.test(filename);
    let parsabilityRisk = "none";
    let parsabilityReason = "";
    if (isImageOnly) {
        parsabilityRisk = "high";
        parsabilityReason =
            "This PDF has no text layer. ATS parsers will see a completely blank document and extract nothing. " +
                "This is most common with scanned resumes, Canva exports saved as images, or photos of a resume.";
    }
    else if (fileType === "pdf" && textToPageRatio < 25 && pageCount <= 3) {
        parsabilityRisk = "high";
        parsabilityReason =
            `Only ${Math.round(textToPageRatio)} text elements extracted per page (expected 80–200+). ` +
                "This usually means the resume uses heavy graphics, embedded images for text, or was exported from a design tool. " +
                "Most of your content is likely invisible to ATS.";
    }
    else if (fileType === "pdf" && (textToPageRatio < 60 || suspiciousName)) {
        parsabilityRisk = "medium";
        parsabilityReason = suspiciousName
            ? "The filename suggests a design template (Canva, Figma, etc.). " +
                "Designed resumes often embed text as images which ATS cannot read. " +
                "Verify all your text is selectable in a PDF viewer."
            : `Lower than expected text density (${Math.round(textToPageRatio)} elements/page). ` +
                "Some content may be in images or text boxes that ATS parsers skip. " +
                "Try selecting all text in your PDF viewer - if you can't select it, ATS can't read it.";
    }
    else if (isMultiColumn || hasHeaderFooterContent) {
        parsabilityRisk = "low";
        parsabilityReason =
            "Multi-column layout or header/footer content detected. " +
                "ATS parsers may scramble or skip some content. " +
                "See formatting rules for specific fixes.";
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
        parserVersion: pdf_extractor_js_1.PARSER_VERSION,
        parsabilityRisk,
        parsabilityReason,
        textItemCount,
        textToPageRatio: Math.round(textToPageRatio),
    };
}
const semantic_matcher_js_1 = require("../llm/semantic-matcher.js");
async function analyze(parseResult, jdText) {
    const rules = (0, rule_engine_js_1.runRules)(parseResult);
    let keywordReport = null;
    if (jdText && jdText.trim().length > 20) {
        const jdRequirements = (0, keyword_matcher_js_1.extractJDRequirements)(jdText);
        if (jdRequirements.length > 0) {
            keywordReport = (0, keyword_matcher_js_1.matchKeywords)(jdRequirements, parseResult);
            // Perform Semantic Matching for missing keywords
            const missingKeywords = keywordReport.missing.map(m => m.keyword);
            if (missingKeywords.length > 0) {
                // Collect all extracted skills and entities for comparison
                const resumeSkills = [
                    ...parseResult.entities.skills,
                    ...parseResult.entities.experience.flatMap(e => e.bullets), // use bullets as context
                ];
                // Basic unique filtering
                const uniqueSkills = Array.from(new Set(resumeSkills)).filter(s => s.trim().length > 2);
                const semanticMatches = await (0, semantic_matcher_js_1.findSemanticMatches)(missingKeywords, uniqueSkills);
                if (semanticMatches.length > 0) {
                    keywordReport.semanticMatches = semanticMatches;
                    // Optionally compute a semantic match rate based on how many missing ones were semantically found
                    const numSemantic = new Set(semanticMatches.map(m => m.jdKeyword)).size;
                    const totalReqs = jdRequirements.length;
                    // Add semantic matched count to the original matched count
                    const originalMatchedCount = keywordReport.matched.length;
                    keywordReport.semanticMatchRate = Math.round(((originalMatchedCount + numSemantic) / totalReqs) * 100);
                }
            }
        }
    }
    const scoreBreakdown = (0, scorer_js_1.computeScore)(parseResult, rules, keywordReport);
    const vendorReports = (0, vendor_profiles_js_1.evaluateVendorProfiles)(parseResult, rules, keywordReport);
    return {
        parseResult,
        rules,
        keywordReport,
        scoreBreakdown,
        vendorReports,
        engineVersion: ENGINE_VERSION,
    };
}
