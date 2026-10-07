// ============================================================
// Reading Order Reconstruction
// PRD §6.2: "handle multi-column, sidebars, tables, text boxes, headers/footers"
// Outputs ATS reading order AND best-effort correct order
// ============================================================

import type { TextItem, LostRegion } from "./types";

interface Line {
  items: TextItem[];
  y: number;       // representative y (top of line)
  page: number;
  columnGroup: number; // 0 = left/single, 1 = right (for 2-col)
}

/**
 * Reconstruct reading order from raw text items.
 * 
 * Strategy:
 * 1. Group items into lines by proximity in y-coordinate
 * 2. For each line, detect if it spans one column or two
 * 3. ATS reading order: naive top-to-bottom, left-to-right (what dumb ATS does)
 * 4. Best-effort order: column-aware (what a human would read)
 */
export function reconstructReadingOrder(
  items: TextItem[],
  isMultiColumn: boolean,
  pageWidth = 600
): { atsOrder: string; bestEffortOrder: string; lostRegions: LostRegion[] } {
  const lostRegions: LostRegion[] = [];

  if (items.length === 0) {
    return { atsOrder: "", bestEffortOrder: "", lostRegions };
  }

  // Step 1: Sort all items by page, then y-coordinate, then x-coordinate (ATS naive order)
  const sorted = [...items].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    const yDiff = a.bbox.y0 - b.bbox.y0;
    if (Math.abs(yDiff) > 3) return yDiff; // different rows
    return a.bbox.x0 - b.bbox.x0; // same row, left to right
  });

  // Step 2: Group into lines (items within 5pt of each other in y are on the same line)
  const lines: Line[] = [];
  let currentLine: TextItem[] = [];
  let currentY = -9999;
  let currentPage = -1;

  for (const item of sorted) {
    if (item.page !== currentPage || Math.abs(item.bbox.y0 - currentY) > 8) {
      if (currentLine.length > 0) {
        lines.push({
          items: currentLine,
          y: currentY,
          page: currentPage,
          columnGroup: 0,
        });
      }
      currentLine = [item];
      currentY = item.bbox.y0;
      currentPage = item.page;
    } else {
      currentLine.push(item);
    }
  }
  if (currentLine.length > 0) {
    lines.push({
      items: currentLine,
      y: currentY,
      page: currentPage,
      columnGroup: 0,
    });
  }

  // Step 3: For multi-column, assign column groups to lines
  const columnMidpoint = pageWidth / 2;
  if (isMultiColumn) {
    for (const line of lines) {
      // A line belongs to left column if most of its items are left of midpoint
      const leftCount = line.items.filter((i) => i.bbox.x0 < columnMidpoint).length;
      const rightCount = line.items.filter((i) => i.bbox.x0 >= columnMidpoint).length;
      line.columnGroup = rightCount > leftCount ? 1 : 0;
    }

    // Mark lines that appear to span across columns (possible scramble zone)
    for (const line of lines) {
      const hasLeft = line.items.some((i) => i.bbox.x0 < columnMidpoint * 0.8);
      const hasRight = line.items.some((i) => i.bbox.x0 > columnMidpoint * 1.2);
      if (hasLeft && hasRight) {
        // Potential column scramble
        const bbox = {
          x0: Math.min(...line.items.map((i) => i.bbox.x0)),
          y0: Math.min(...line.items.map((i) => i.bbox.y0)),
          x1: Math.max(...line.items.map((i) => i.bbox.x1)),
          y1: Math.max(...line.items.map((i) => i.bbox.y1)),
        };
        lostRegions.push({
          page: line.page,
          bbox,
          reason: "column_merge",
          text: line.items.map((i) => i.text).join(" "),
        });
      }
    }
  }

  // Step 4: Build ATS reading order (naive: just concatenate all text sorted by page+y+x)
  const atsLines: string[] = [];
  for (const line of lines) {
    const lineText = line.items
      .sort((a, b) => a.bbox.x0 - b.bbox.x0)
      .map((i) => i.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (lineText) atsLines.push(lineText);
  }
  const atsOrder = atsLines.join("\n");

  // Step 5: Build best-effort reading order (column-aware)
  let bestEffortOrder: string;
  if (!isMultiColumn) {
    bestEffortOrder = atsOrder; // Same for single column
  } else {
    // Process page by page, within each page do left column first then right column
    const pageNums = [...new Set(lines.map((l) => l.page))].sort((a, b) => a - b);
    const bestLines: string[] = [];

    for (const pageNum of pageNums) {
      const pageLines = lines.filter((l) => l.page === pageNum);
      const leftLines = pageLines.filter((l) => l.columnGroup === 0).sort((a, b) => a.y - b.y);
      const rightLines = pageLines.filter((l) => l.columnGroup === 1).sort((a, b) => a.y - b.y);

      // Read left column top to bottom
      for (const line of leftLines) {
        const text = line.items.sort((a, b) => a.bbox.x0 - b.bbox.x0).map((i) => i.text).join(" ").trim();
        if (text) bestLines.push(text);
      }
      // Then right column top to bottom
      for (const line of rightLines) {
        const text = line.items.sort((a, b) => a.bbox.x0 - b.bbox.x0).map((i) => i.text).join(" ").trim();
        if (text) bestLines.push(text);
      }
    }
    bestEffortOrder = bestLines.join("\n");
  }

  return { atsOrder, bestEffortOrder, lostRegions };
}
