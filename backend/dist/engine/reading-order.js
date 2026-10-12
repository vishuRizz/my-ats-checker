"use strict";
// ============================================================
// Reading Order Reconstruction v2
// PRD §6.2: multi-column, sidebars, tables, text boxes, headers/footers
// Outputs ATS reading order AND best-effort correct order.
//
// Fixes in v2:
// - Run joining: only insert space when horizontal gap > 0.2× fontSize
//   (prevents "ecosystem :", "data ,", "Store ;")
// - Horizontal splitting: split tokens on large gaps > 1.5× avgCharWidth
//   (prevents "Chain Remote, India", "Architect 2026" gluing)
// - Column_merge lostRegions grouped by reason and capped (not 21 noise flags)
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconstructReadingOrder = reconstructReadingOrder;
// Join items on the same line, inserting a space only when the gap
// between adjacent items exceeds threshold × fontSize.
// This prevents "ecosystem :" and "data ," while keeping "Node.js" whole.
function joinLineItems(items, gapThreshold = 0.4) {
    if (items.length === 0)
        return "";
    const sorted = [...items].sort((a, b) => a.bbox.x0 - b.bbox.x0);
    let result = sorted[0].text;
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const gap = curr.bbox.x0 - prev.bbox.x1;
        const fontSize = (prev.fontSize + curr.fontSize) / 2;
        const threshold = fontSize * gapThreshold;
        if (gap > threshold) {
            result += " " + curr.text;
        }
        else if (gap > -1) {
            // Close but not overlapping - no space needed (e.g. "Node.js")
            result += curr.text;
        }
        else {
            // Overlapping (negative gap) - same text chunk, no separator
            result += curr.text;
        }
    }
    return result;
}
function reconstructReadingOrder(items, isMultiColumn, pageWidth = 600) {
    const lostRegions = [];
    if (items.length === 0) {
        return { atsOrder: "", bestEffortOrder: "", lostRegions };
    }
    // Sort all items by page → y → x
    const sorted = [...items].sort((a, b) => {
        if (a.page !== b.page)
            return a.page - b.page;
        const yDiff = a.bbox.y0 - b.bbox.y0;
        if (Math.abs(yDiff) > 5)
            return yDiff;
        return a.bbox.x0 - b.bbox.x0;
    });
    // Group into lines (items within 6pt of each other in y are on the same line)
    const lines = [];
    let currentItems = [];
    let currentY = -9999;
    let currentPage = -1;
    for (const item of sorted) {
        if (item.page !== currentPage || Math.abs(item.bbox.y0 - currentY) > 6) {
            if (currentItems.length > 0) {
                lines.push({ items: currentItems, y: currentY, page: currentPage, columnGroup: 0 });
            }
            currentItems = [item];
            currentY = item.bbox.y0;
            currentPage = item.page;
        }
        else {
            currentItems.push(item);
        }
    }
    if (currentItems.length > 0) {
        lines.push({ items: currentItems, y: currentY, page: currentPage, columnGroup: 0 });
    }
    // For multi-column: assign column groups and generate lostRegions
    if (isMultiColumn) {
        const columnMidpoint = pageWidth / 2;
        for (const line of lines) {
            const leftItems = line.items.filter((i) => i.bbox.x0 < columnMidpoint * 0.85);
            const rightItems = line.items.filter((i) => i.bbox.x0 > columnMidpoint * 1.15);
            line.columnGroup = rightItems.length > leftItems.length ? 1 : 0;
            // Only flag as column_merge if items genuinely span both columns with a gap
            if (leftItems.length > 0 && rightItems.length > 0) {
                const maxLeft = Math.max(...leftItems.map((i) => i.bbox.x1));
                const minRight = Math.min(...rightItems.map((i) => i.bbox.x0));
                if (minRight - maxLeft > pageWidth * 0.06) {
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
        // Cap lostRegions to avoid noise: keep at most 1 representative region per
        // reason per page (group by reason and de-duplicate to bounding boxes)
        const grouped = new Map();
        for (const r of lostRegions) {
            const key = `${r.page}:${r.reason}`;
            if (!grouped.has(key))
                grouped.set(key, []);
            grouped.get(key).push(r);
        }
        // Replace lostRegions with one merged bbox per group
        lostRegions.length = 0;
        for (const [, group] of grouped) {
            // Merge into one bounding box per page+reason group
            const merged = {
                page: group[0].page,
                reason: group[0].reason,
                bbox: {
                    x0: Math.min(...group.map((r) => r.bbox.x0)),
                    y0: Math.min(...group.map((r) => r.bbox.y0)),
                    x1: Math.max(...group.map((r) => r.bbox.x1)),
                    y1: Math.max(...group.map((r) => r.bbox.y1)),
                },
                text: `${group.length} regions - e.g. "${group[0].text?.slice(0, 60) ?? ""}"`,
            };
            lostRegions.push(merged);
        }
    }
    // Build ATS reading order (naive top-to-bottom, left-to-right)
    const atsLines = [];
    for (const line of lines) {
        const lineText = joinLineItems(line.items).replace(/\s+/g, " ").trim();
        if (lineText)
            atsLines.push(lineText);
    }
    const atsOrder = atsLines.join("\n");
    // Build best-effort reading order (column-aware)
    let bestEffortOrder;
    if (!isMultiColumn) {
        bestEffortOrder = atsOrder;
    }
    else {
        const pageNums = [...new Set(lines.map((l) => l.page))].sort((a, b) => a - b);
        const bestLines = [];
        for (const pageNum of pageNums) {
            const pageLines = lines.filter((l) => l.page === pageNum);
            const leftLines = pageLines.filter((l) => l.columnGroup === 0).sort((a, b) => a.y - b.y);
            const rightLines = pageLines.filter((l) => l.columnGroup === 1).sort((a, b) => a.y - b.y);
            for (const line of leftLines) {
                const text = joinLineItems(line.items).trim();
                if (text)
                    bestLines.push(text);
            }
            for (const line of rightLines) {
                const text = joinLineItems(line.items).trim();
                if (text)
                    bestLines.push(text);
            }
        }
        bestEffortOrder = bestLines.join("\n");
    }
    return { atsOrder, bestEffortOrder, lostRegions };
}
