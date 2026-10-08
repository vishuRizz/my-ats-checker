"use strict";
// ============================================================
// PDF Extractor
// Uses pdfjs-dist v4 via dynamic import (ESM package in CJS host)
// Extracts text items WITH coordinates for reading-order reconstruction
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARSER_VERSION = void 0;
exports.extractPDFText = extractPDFText;
exports.detectMultiColumn = detectMultiColumn;
exports.detectHeaderFooterItems = detectHeaderFooterItems;
const PARSER_VERSION = "pdfjs-dist@4.x-phase1";
exports.PARSER_VERSION = PARSER_VERSION;
let _pdfjsLib = null;
/**
 * Lazy-loads pdfjs-dist once. Dynamic import allows CJS host to consume ESM package.
 */
async function getPdfjs() {
    if (_pdfjsLib)
        return _pdfjsLib;
    _pdfjsLib = await Promise.resolve().then(() => __importStar(require("pdfjs-dist")));
    // Disable web worker - not available in Node.js
    if (_pdfjsLib.GlobalWorkerOptions) {
        _pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    }
    return _pdfjsLib;
}
/**
 * Extract text items with coordinates from a PDF buffer.
 */
async function extractPDFText(buffer) {
    const warnings = [];
    let isImageOnly = false;
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
            // Transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
            const transform = item.transform;
            const x = transform[4];
            const y = transform[5]; // PDF: bottom-left origin
            const width = item.width ?? 0;
            const height = item.height ?? Math.abs(transform[3]) ?? 12;
            // Convert to top-left origin
            const y0 = pageHeight - y - height;
            const y1 = pageHeight - y;
            const fontName = item.fontName ?? "";
            const isBold = /bold/i.test(fontName) || /heavy/i.test(fontName);
            const fontSize = Math.abs(transform[3]) || 12;
            allItems.push({
                text: item.str,
                page: pageNum,
                bbox: { x0: x, y0, x1: x + width, y1 },
                fontSize,
                fontName,
                isBold,
            });
        }
    }
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
 * Detect multi-column layout by analysing horizontal clustering of text items.
 */
function detectMultiColumn(items, pageWidth = 600) {
    if (items.length < 10)
        return false;
    const midMin = pageWidth * 0.38;
    const midMax = pageWidth * 0.62;
    const xStarts = items.map((i) => i.bbox.x0);
    const leftItems = xStarts.filter((x) => x < midMin);
    const rightItems = xStarts.filter((x) => x > midMax);
    const middleItems = xStarts.filter((x) => x >= midMin && x <= midMax);
    const hasGap = leftItems.length > 5 &&
        rightItems.length > 5 &&
        middleItems.length < (leftItems.length + rightItems.length) * 0.2;
    const lineGroups = new Map();
    for (const item of items) {
        const roundedY = Math.round(item.bbox.y0 / 5) * 5;
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
 * Detect items in header/footer regions (top 8% and bottom 8% of page).
 */
function detectHeaderFooterItems(items, pageHeightEstimate = 840) {
    return {
        headerItems: items.filter((i) => i.bbox.y1 < pageHeightEstimate * 0.08),
        footerItems: items.filter((i) => i.bbox.y0 > pageHeightEstimate * 0.92),
    };
}
