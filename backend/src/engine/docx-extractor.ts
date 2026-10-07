// ============================================================
// DOCX Extractor — Phase 1
// Uses mammoth.js to extract text and structure from DOCX files
// ============================================================

import mammoth from "mammoth";
import type { TextItem, ParseWarning, BBox } from "./types";

export interface RawDOCXData {
  textItems: TextItem[];
  rawText: string;
  warnings: ParseWarning[];
  hasTable: boolean;
}

/**
 * Extract text from a DOCX buffer using mammoth.
 * mammoth converts DOCX to plain text with basic structure preserved.
 */
export async function extractDOCXText(buffer: Buffer): Promise<RawDOCXData> {
  const warnings: ParseWarning[] = [];
  let hasTable = false;

  let result: { value: string; messages: any[] };
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (err: any) {
    throw new Error(`Failed to parse DOCX: ${err?.message || "unknown error"}`);
  }

  // Pass through any mammoth warnings
  for (const msg of result.messages) {
    if (msg.type === "warning") {
      warnings.push({ type: "docx_warning", message: msg.message });
    }
  }

  const rawText = result.value;

  // Check for tables (mammoth will include table content but may warn)
  const hasTableWarning = result.messages.some((m: any) => /table/i.test(m.message || ""));
  if (hasTableWarning) {
    hasTable = true;
    warnings.push({ type: "table_layout", message: "Tables detected in DOCX. Table content may be parsed in unexpected order." });
  }

  // Convert raw text into TextItem array (DOCX has no coordinate info)
  // We simulate line-by-line with fake coordinates for consistency with the engine
  const lines = rawText.split("\n");
  const textItems: TextItem[] = [];
  let yPosition = 0;

  for (const line of lines) {
    if (!line.trim()) {
      yPosition += 15; // blank line spacing
      continue;
    }

    // Heuristic for DOCX: detect headings by ALL CAPS or short standalone lines
    const isLikelyBold = line.trim() === line.trim().toUpperCase() && line.trim().length < 50;
    const fontSize = isLikelyBold ? 14 : 11;

    textItems.push({
      text: line,
      page: 1, // DOCX doesn't have pages in the same way
      bbox: { x0: 0, y0: yPosition, x1: 500, y1: yPosition + fontSize } as BBox,
      fontSize,
      fontName: isLikelyBold ? "BoldFont" : "NormalFont",
      isBold: isLikelyBold,
    });

    yPosition += fontSize + 3;
  }

  return { textItems, rawText, warnings, hasTable };
}
