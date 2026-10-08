"use strict";
// ============================================================
// PDF Extractor v2
// Uses pdfjs-dist v4 via dynamic import (ESM package in CJS host)
// Extracts text items WITH coordinates for reading-order reconstruction
// Also reads link annotations for URL extraction.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARSER_VERSION = void 0;
exports.extractPDFText = extractPDFText;
exports.detectMultiColumn = detectMultiColumn;
exports.detectHeaderFooterItems = detectHeaderFooterItems;
const PARSER_VERSION = "pdfjs-dist@4.x-phase1.2";
exports.PARSER_VERSION = PARSER_VERSION;
let _pdfjsLib = null;
async function getPdfjs() {
    if (_pdfjsLib)
        return _pdfjsLib;
    _pdfjsLib = await import("pdfjs-dist");
    if (_pdfjsLib.GlobalWorkerOptions) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const workerPath = require.resolve("pdfjs-dist/build/pdf.worker.mjs");
        _pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
    }
    return _pdfjsLib;
}
async function extractPDFText(buffer) {
    const warnings = [];
    let isImageOnly = false;
    const pageWidths = [];
    const pageHeights = [];
    const links = [];
    const pdfjs = await getPdfjs();
    let pdf;
    try {
        const data = new Uint8Array(buffer);
        const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true });
        pdf = await loadingTask.promise;
    }
    catch (err) {
        if (err?.name === "PasswordException") {
            throw new Error("PDF is password-protected. Please remove the password and re-upload.");
        }
        throw new Error(`Failed to open PDF: ${err?.message ?? "unknown error"}`);
    }
    const pageCount = pdf.numPages;
    const allItems = [];
    let totalTextItems = 0;
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageHeight = viewport.height;
        const pageWidth = viewport.width;
        pageWidths.push(pageWidth);
        pageHeights.push(pageHeight);
        let textContent;
        try {
            textContent = await page.getTextContent();
        }
        catch {
            warnings.push({ type: "page_error", message: `Could not extract text from page ${pageNum}`, page: pageNum });
            continue;
        }
        const items = textContent.items;
        totalTextItems += items.length;
        for (const item of items) {
            if (!item.str || item.str.trim() === "")
                continue;
            const transform = item.transform;
            const x = transform[4];
            const y = transform[5]; // PDF: bottom-left origin
            const width = item.width ?? 0;
            const height = item.height ?? Math.abs(transform[3]) ?? 12;
            const fontSize = Math.abs(transform[3]) || 12;
            // Convert to top-left origin
            const y0 = pageHeight - y - height;
            const y1 = pageHeight - y;
            const fontName = item.fontName ?? "";
            const isBold = /bold/i.test(fontName) || /heavy/i.test(fontName);
            allItems.push({
                text: item.str,
                page: pageNum,
                bbox: { x0: x, y0, x1: x + width, y1 },
                fontSize,
                fontName,
                isBold,
            });
        }
        // ── Extract link annotations ────────────────────────────────
        try {
            const annotations = await page.getAnnotations();
            for (const ann of annotations) {
                if (ann.subtype === "Link" && ann.url) {
                    // Try to find the label text overlapping this annotation rect
                    // pdfjs rect: [x0, y0, x1, y1] in PDF coords (bottom-left origin)
                    const [ax0, ay0, ax1, ay1] = ann.rect;
                    // Convert to top-left
                    const rectY0 = pageHeight - ay1;
                    const rectY1 = pageHeight - ay0;
                    const overlapping = allItems.filter((it) => it.page === pageNum &&
                        it.bbox.x0 >= ax0 - 2 && it.bbox.x1 <= ax1 + 2 &&
                        it.bbox.y0 >= rectY0 - 4 && it.bbox.y1 <= rectY1 + 4);
                    const label = overlapping.map((it) => it.text).join("").trim() || ann.url;
                    links.push({ url: ann.url, label, page: pageNum });
                }
            }
        }
        catch {
            // Annotations are optional - don't fail the whole parse
        }
    }
    if (totalTextItems === 0) {
        isImageOnly = true;
        warnings.push({
            type: "image_only",
            message: "This PDF appears to be image-only (scanned). No text layer was found. OCR support is coming in Phase 2.",
        });
    }
    return { textItems: allItems, pageCount, pageWidths, pageHeights, warnings, isImageOnly, links };
}
// ─── Multi-column detection (improved) ────────────────────────
// Only flag if a vertical gutter runs through ≥4 BODY text lines
// on both sides. Short right-aligned date/location tokens are ignored.
// Self-check: if atsOrder == geometricOrder, reading order can't scramble.
function detectMultiColumn(items, pageWidth = 600, pageCount = 1) {
    if (items.length < 15)
        return false;
    // Only look at body text (not very short items, not very small font)
    const avgFontSize = items.reduce((s, i) => s + i.fontSize, 0) / items.length;
    const bodyItems = items.filter((i) => i.fontSize >= avgFontSize * 0.85 && i.text.trim().length > 3);
    if (bodyItems.length < 10)
        return false;
    // Group body items into lines
    const lineMap = new Map();
    for (const item of bodyItems) {
        const key = Math.round(item.bbox.y0 / 6) * 6;
        if (!lineMap.has(key))
            lineMap.set(key, []);
        lineMap.get(key).push(item);
    }
    // Count lines where items appear on BOTH sides of the midpoint
    // with a gap between them (true gutter) vs lines with a wide single item
    const midpoint = pageWidth / 2;
    const gutterLeft = pageWidth * 0.35;
    const gutterRight = pageWidth * 0.65;
    let gutterLines = 0;
    let totalBodyLines = 0;
    // Regex to detect contact/link bar lines (email, phone, URL tokens)
    const CONTACT_LINE_PATTERN = /@|https?:\/\/|linkedin|github|upwork|leetcode|portfolio|\b\d{7,}\b/i;
    for (const lineItems of lineMap.values()) {
        totalBodyLines++;
        const lineText = lineItems.map((i) => i.text).join(" ");
        // Skip lines that look like a contact/link bar
        if (CONTACT_LINE_PATTERN.test(lineText))
            continue;
        const leftSide = lineItems.filter((i) => i.bbox.x1 < gutterLeft);
        const rightSide = lineItems.filter((i) => i.bbox.x0 > gutterRight);
        if (leftSide.length > 0 && rightSide.length > 0) {
            const maxLeft = Math.max(...leftSide.map((i) => i.bbox.x1));
            const minRight = Math.min(...rightSide.map((i) => i.bbox.x0));
            if (minRight - maxLeft > pageWidth * 0.08) {
                gutterLines++;
            }
        }
    }
    // Require gutter across at least 30% of body lines AND minimum 4 lines
    const gutterRatio = totalBodyLines > 0 ? gutterLines / totalBodyLines : 0;
    if (gutterLines < 4 || gutterRatio < 0.30)
        return false;
    // Self-check: verify items are NOT just date/location tokens on right
    // (right-side items that are short and look like dates/locations don't count)
    const rightBodyItems = bodyItems.filter((i) => i.bbox.x0 > gutterRight);
    const realRightContent = rightBodyItems.filter((i) => !/^\d{4}$/.test(i.text.trim()) && !/^(present|current|remote|india|usa|uk)$/i.test(i.text.trim()));
    return realRightContent.length >= 5;
}
// ─── Header/footer detection (improved) ───────────────────────
// Only flag text in the page margin on MULTI-PAGE documents.
// On a 1-page resume, the "header" area is just the contact block - don't flag it.
function detectHeaderFooterItems(items, pageHeights, pageCount) {
    // On a single-page file, never flag header/footer - it's just the contact block.
    if (pageCount === 1) {
        return { headerItems: [], footerItems: [] };
    }
    const headerItems = [];
    const footerItems = [];
    for (const item of items) {
        const ph = pageHeights[item.page - 1] ?? 840;
        if (item.bbox.y1 < ph * 0.06)
            headerItems.push(item);
        else if (item.bbox.y0 > ph * 0.94)
            footerItems.push(item);
    }
    return { headerItems, footerItems };
}
