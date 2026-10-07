// ============================================================
// PDF Extractor
// Uses pdfjs-dist v4 via dynamic import (ESM package in CJS host)
// Extracts text items WITH coordinates for reading-order reconstruction
// ============================================================

import type { TextItem, ParseWarning, BBox } from "./types";

const PARSER_VERSION = "pdfjs-dist@4.x-phase1";

export interface RawPDFData {
  textItems: TextItem[];
  pageCount: number;
  warnings: ParseWarning[];
  isImageOnly: boolean;
}

let _pdfjsLib: any = null;

/**
 * Lazy-loads pdfjs-dist once. Dynamic import allows CJS host to consume ESM package.
 */
async function getPdfjs() {
  if (_pdfjsLib) return _pdfjsLib;
  _pdfjsLib = await import("pdfjs-dist");
  // In Node.js, point workerSrc to the actual worker file via require.resolve (CJS-safe)
  if (_pdfjsLib.GlobalWorkerOptions) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const workerPath: string = require.resolve("pdfjs-dist/build/pdf.worker.mjs");
    _pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
  }
  return _pdfjsLib;
}

/**
 * Extract text items with coordinates from a PDF buffer.
 */
export async function extractPDFText(buffer: Buffer): Promise<RawPDFData> {
  const warnings: ParseWarning[] = [];
  let isImageOnly = false;

  const pdfjs = await getPdfjs();

  let pdf: any;
  try {
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true });
    pdf = await loadingTask.promise;
  } catch (err: any) {
    if (err?.name === "PasswordException") {
      throw new Error("PDF is password-protected. Please remove the password and re-upload.");
    }
    throw new Error(`Failed to open PDF: ${err?.message ?? "unknown error"}`);
  }

  const pageCount: number = pdf.numPages;
  const allItems: TextItem[] = [];
  let totalTextItems = 0;

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight: number = viewport.height;

    let textContent: any;
    try {
      textContent = await page.getTextContent();
    } catch {
      warnings.push({ type: "page_error", message: `Could not extract text from page ${pageNum}`, page: pageNum });
      continue;
    }

    const items: any[] = textContent.items;
    totalTextItems += items.length;

    for (const item of items) {
      if (!item.str || item.str.trim() === "") continue;

      // Transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const transform: number[] = item.transform;
      const x = transform[4];
      const y = transform[5]; // PDF: bottom-left origin
      const width: number = item.width ?? 0;
      const height: number = item.height ?? Math.abs(transform[3]) ?? 12;

      // Convert to top-left origin
      const y0 = pageHeight - y - height;
      const y1 = pageHeight - y;

      const fontName: string = item.fontName ?? "";
      const isBold = /bold/i.test(fontName) || /heavy/i.test(fontName);
      const fontSize = Math.abs(transform[3]) || 12;

      allItems.push({
        text: item.str,
        page: pageNum,
        bbox: { x0: x, y0, x1: x + width, y1 } as BBox,
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
export function detectMultiColumn(items: TextItem[], pageWidth = 600): boolean {
  if (items.length < 10) return false;

  const midMin = pageWidth * 0.38;
  const midMax = pageWidth * 0.62;

  const xStarts = items.map((i) => i.bbox.x0);
  const leftItems = xStarts.filter((x) => x < midMin);
  const rightItems = xStarts.filter((x) => x > midMax);
  const middleItems = xStarts.filter((x) => x >= midMin && x <= midMax);

  const hasGap =
    leftItems.length > 5 &&
    rightItems.length > 5 &&
    middleItems.length < (leftItems.length + rightItems.length) * 0.2;

  const lineGroups = new Map<number, TextItem[]>();
  for (const item of items) {
    const roundedY = Math.round(item.bbox.y0 / 5) * 5;
    if (!lineGroups.has(roundedY)) lineGroups.set(roundedY, []);
    lineGroups.get(roundedY)!.push(item);
  }

  let parallelLines = 0;
  for (const [, lineItems] of lineGroups) {
    if (lineItems.length < 2) continue;
    const xPositions = lineItems.map((i) => i.bbox.x0).sort((a, b) => a - b);
    const span = xPositions[xPositions.length - 1] - xPositions[0];
    if (span > pageWidth * 0.4) parallelLines++;
  }

  return hasGap || parallelLines > 3;
}

/**
 * Detect items in header/footer regions (top 8% and bottom 8% of page).
 */
export function detectHeaderFooterItems(
  items: TextItem[],
  pageHeightEstimate = 840
): { headerItems: TextItem[]; footerItems: TextItem[] } {
  return {
    headerItems: items.filter((i) => i.bbox.y1 < pageHeightEstimate * 0.08),
    footerItems: items.filter((i) => i.bbox.y0 > pageHeightEstimate * 0.92),
  };
}

export { PARSER_VERSION };
