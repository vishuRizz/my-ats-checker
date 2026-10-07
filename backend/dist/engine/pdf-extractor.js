"use strict";
// ============================================================
// PDF Extractor
// Uses pdfjs-dist to extract text items WITH coordinates
// Handles: single-column, multi-column detection, header/footer detection
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARSER_VERSION = void 0;
exports.extractPDFText = extractPDFText;
exports.detectMultiColumn = detectMultiColumn;
exports.detectHeaderFooterItems = detectHeaderFooterItems;
// pdfjs-dist Node.js usage - we use the legacy build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
pdfjsLib.GlobalWorkerOptions.workerSrc = false; // Disable worker in Node.js
const PARSER_VERSION = "pdfjs-dist@4.x-phase1";
exports.PARSER_VERSION = PARSER_VERSION;
/**
 * Extract text items with coordinates from a PDF buffer.
 * Each TextItem includes position, font info, and text content.
 */
async function extractPDFText(buffer) {
    const warnings = [];
    let isImageOnly = false;
    let pdf;
    try {
        const data = new Uint8Array(buffer);
        pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
    }
    catch (err) {
        if (err?.name === "PasswordException") {
            throw new Error("PDF is password-protected. Please remove the password and re-upload.");
        }
        throw new Error(`Failed to open PDF: ${err?.message || "unknown error"}`);
    }
    const pageCount = pdf.numPages;
    const allItems = [];
    let totalTextItems = 0;
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageHeight = viewport.height;
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
            // Transform matrix: [scaleX, skewX, skewY, scaleY, translateX, translateY]
            const transform = item.transform;
            const x = transform[4];
            const y = transform[5]; // in PDF coordinates (bottom-left origin)
            const width = item.width || 0;
            const height = item.height || Math.abs(transform[3]) || 12;
            // Convert to top-left origin for easier processing
            const y0 = pageHeight - y - height;
            const y1 = pageHeight - y;
            // Detect font weight from font name
            const fontName = item.fontName || "";
            const isBold = /bold/i.test(fontName) || /heavy/i.test(fontName);
            const fontSize = Math.abs(transform[3]) || 12;
            allItems.push({
                text: item.str,
                page: pageNum,
                bbox: { x0: x, y0: y0, x1: x + width, y1: y1 },
                fontSize,
                fontName,
                isBold,
            });
        }
    }
    // Detect image-only PDFs (no text extracted across all pages)
    if (totalTextItems === 0) {
        isImageOnly = true;
        warnings.push({
            type: "image_only",
            message: "This PDF appears to be image-only (scanned). No text layer was found. OCR support is coming in Phase 2.",
        });
    }
    return { textItems: allItems, pageCount, warnings, isImageOnly };
}
/**
 * Detect multi-column layout by analyzing horizontal clustering of text items.
 * Returns true if two or more distinct column groups exist.
 */
function detectMultiColumn(items, pageWidth = 600) {
    if (items.length < 10)
        return false;
    // Look at the x-start positions of text items
    // If there's a clear gap in the middle (20-80% of page), it's multi-column
    const xStarts = items.map((i) => i.bbox.x0).sort((a, b) => a - b);
    const leftBound = pageWidth * 0.2;
    const rightBound = pageWidth * 0.8;
    const midMin = pageWidth * 0.38;
    const midMax = pageWidth * 0.62;
    // Count items in left half vs right half
    const leftItems = xStarts.filter((x) => x < midMin);
    const rightItems = xStarts.filter((x) => x > midMax);
    const middleItems = xStarts.filter((x) => x >= midMin && x <= midMax);
    // If there are significant items on both sides but a gap in the middle
    const hasGap = leftItems.length > 5 && rightItems.length > 5 && middleItems.length < (leftItems.length + rightItems.length) * 0.2;
    // Also check: are there items with similar y-coordinates but very different x-coordinates?
    const lineGroups = new Map();
    for (const item of items) {
        const roundedY = Math.round(item.bbox.y0 / 5) * 5; // group by ~5pt rows
        if (!lineGroups.has(roundedY))
            lineGroups.set(roundedY, []);
        lineGroups.get(roundedY).push(item);
    }
    let parallelLines = 0;
    for (const [, lineItems] of lineGroups) {
        if (lineItems.length < 2)
            continue;
        const xPositions = lineItems.map((i) => i.bbox.x0).sort((a, b) => a - b);
        const span = xPositions[xPositions.length - 1] - xPositions[0];
        if (span > pageWidth * 0.4)
            parallelLines++;
    }
    return hasGap || parallelLines > 3;
}
/**
 * Detect header/footer regions (top 8% and bottom 8% of page)
 */
function detectHeaderFooterItems(items, pageHeightEstimate = 840) {
    const headerThreshold = pageHeightEstimate * 0.08;
    const footerThreshold = pageHeightEstimate * 0.92;
    const headerItems = items.filter((i) => i.bbox.y1 < headerThreshold);
    const footerItems = items.filter((i) => i.bbox.y0 > footerThreshold);
    return { headerItems, footerItems };
}
