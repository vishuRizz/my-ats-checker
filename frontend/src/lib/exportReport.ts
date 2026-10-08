// ============================================================
// Export Utility — generates a full ATS Analysis Report
// Supports: PDF (jsPDF + autotable) and DOCX (docx.js)
// ============================================================

import type { AnalysisResponse } from "@/types";

// ─── PDF Export ──────────────────────────────────────────────

export async function exportPDF(data: AnalysisResponse, filename: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Colour palette ──
  const INDIGO: [number, number, number] = [99, 102, 241];
  const DARK: [number, number, number] = [15, 18, 30];
  const MUTED: [number, number, number] = [100, 110, 130];
  const GREEN: [number, number, number] = [16, 185, 129];
  const AMBER: [number, number, number] = [245, 158, 11];
  const RED: [number, number, number] = [239, 68, 68];
  const WHITE: [number, number, number] = [255, 255, 255];
  const LIGHT_BG: [number, number, number] = [248, 249, 255];

  const severityColor = (s: string): [number, number, number] =>
    s === "critical" ? RED : s === "warning" ? AMBER : INDIGO;

  const scoreColor = (n: number): [number, number, number] =>
    n >= 80 ? GREEN : n >= 60 ? AMBER : RED;

  // ── Helpers ──
  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkY = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) addPage();
  };

  const heading1 = (text: string) => {
    checkY(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...INDIGO);
    doc.text(text, margin, y);
    y += 8;
    doc.setDrawColor(...INDIGO);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  const heading2 = (text: string) => {
    checkY(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(text, margin, y);
    y += 7;
  };

  const body = (text: string, indent = 0, color: [number,number,number] = DARK) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW - indent);
    checkY(lines.length * 5);
    doc.text(lines, margin + indent, y);
    y += lines.length * 5 + 1;
  };

  const badge = (text: string, color: [number,number,number], x: number, by: number) => {
    doc.setFillColor(...color);
    doc.setTextColor(...WHITE);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const w = doc.getTextWidth(text) + 6;
    doc.roundedRect(x, by - 4.5, w, 6, 1.5, 1.5, "F");
    doc.text(text, x + 3, by);
    return w + 3;
  };

  const scoreBox = (label: string, score: number, x: number, bw: number, by: number) => {
    const col = scoreColor(score);
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(x, by, bw, 22, 3, 3, "F");
    doc.setDrawColor(...col);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, by, bw, 22, 3, 3, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...col);
    doc.text(`${score}`, x + bw / 2, by + 13, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + bw / 2, by + 19, { align: "center" });
  };

  // ══════════════════════════════════════════
  // PAGE 1 — COVER
  // ══════════════════════════════════════════
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 60, "F");

  doc.setFillColor(...INDIGO);
  doc.rect(0, 60, pageW, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...WHITE);
  doc.text("ATS Analysis Report", pageW / 2, 28, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(180, 185, 220);
  doc.text("See what the ATS actually sees", pageW / 2, 38, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(130, 140, 170);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageW / 2, 46, { align: "center" });

  y = 74;

  // Filename pill
  doc.setFillColor(240, 242, 255);
  doc.roundedRect(margin, y, contentW, 14, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(`📄 ${filename}`, margin + 6, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `${data.parseResult.fileType.toUpperCase()} · ${data.parseResult.pageCount} page(s) · analysed in ${(data.meta.totalTimeMs / 1000).toFixed(1)}s`,
    pageW - margin - 4,
    y + 9,
    { align: "right" }
  );
  y += 22;

  // ── Score boxes ──
  const overall = data.scoreBreakdown.overall;
  const boxW = (contentW - 6) / 4;
  checkY(32);
  scoreBox("Overall Score", overall, margin, boxW, y);
  scoreBox("Parse Integrity", data.scoreBreakdown.parseIntegrity.score, margin + boxW + 2, boxW, y);
  scoreBox("Formatting", data.scoreBreakdown.formattingRisks.score, margin + (boxW + 2) * 2, boxW, y);
  scoreBox("Bullets", data.scoreBreakdown.bulletQuality.score, margin + (boxW + 2) * 3, boxW, y);
  y += 30;

  if (data.scoreBreakdown.keywordCoverage) {
    checkY(12);
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Keyword Coverage: ${data.scoreBreakdown.keywordCoverage.score}/100  |  ` +
      (data.keywordReport ? `Match Rate: ${data.keywordReport.matchRate}%` : "No JD provided"),
      margin, y
    );
    y += 8;
  }

  // ══════════════════════════════════════════
  // SECTION 1 — EXTRACTED ENTITIES
  // ══════════════════════════════════════════
  heading1("1. Extracted Contact & Entities");

  const { entities } = data.parseResult;
  const entityRows = [
    ["Name", entities.name.value || "Not found", `${Math.round(entities.name.confidence * 100)}%`],
    ["Email", entities.email.value || "Not found", `${Math.round(entities.email.confidence * 100)}%`],
    ["Phone", entities.phone.value || "Not found", `${Math.round(entities.phone.confidence * 100)}%`],
    ["Links", entities.links.join(", ") || "None", "—"],
    ["Skills (extracted)", entities.skills.slice(0, 20).join(", ") || "None", "—"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Extracted Value", "Confidence"]],
    body: entityRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: INDIGO, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 255] },
    columnStyles: { 2: { halign: "center", cellWidth: 28 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Sections detected
  heading2("Detected Sections");
  const sectionRows = data.parseResult.sections.map((s) => [
    s.name.charAt(0).toUpperCase() + s.name.slice(1),
    s.rawHeading || s.name,
    `Page ${s.startPage}`,
    `${Math.round(s.confidence * 100)}%`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Section", "Found As", "Page", "Confidence"]],
    body: sectionRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [60, 65, 100], textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 255] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════
  // SECTION 2 — FORMATTING RULES
  // ══════════════════════════════════════════
  heading1("2. Formatting Rules & Issues");

  const critRules = data.rules.filter((r) => r.severity === "critical");
  const warnRules = data.rules.filter((r) => r.severity === "warning");
  const infoRules = data.rules.filter((r) => r.severity === "info");

  checkY(8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(
    `${critRules.length} critical  ·  ${warnRules.length} warnings  ·  ${infoRules.length} info`,
    margin, y
  );
  y += 7;

  if (data.rules.length === 0) {
    body("✅ No formatting issues detected. Perfect formatting!", 0, GREEN);
  } else {
    const ruleRows = [...critRules, ...warnRules, ...infoRules].map((r) => [
      r.severity.toUpperCase(),
      r.message,
      `-${r.pointsLost} pts`,
      r.fix,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Severity", "Issue", "Points", "How to Fix"]],
      body: ruleRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: INDIGO, textColor: WHITE, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: "bold" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 60 },
      },
      didParseCell: (data) => {
        if (data.column.index === 0 && data.section === "body") {
          const val = String(data.cell.raw);
          if (val === "CRITICAL") data.cell.styles.textColor = RED;
          else if (val === "WARNING") data.cell.styles.textColor = AMBER;
          else data.cell.styles.textColor = INDIGO;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ══════════════════════════════════════════
  // SECTION 3 — SCORE BREAKDOWN
  // ══════════════════════════════════════════
  heading1("3. Score Breakdown");

  const scoreCategories = [
    data.scoreBreakdown.parseIntegrity,
    data.scoreBreakdown.formattingRisks,
    data.scoreBreakdown.bulletQuality,
    ...(data.scoreBreakdown.keywordCoverage ? [data.scoreBreakdown.keywordCoverage] : []),
    ...(data.scoreBreakdown.experienceRelevance ? [data.scoreBreakdown.experienceRelevance] : []),
  ];

  for (const cat of scoreCategories) {
    checkY(12);
    const col = scoreColor(cat.score);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(`${cat.name}`, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...col);
    doc.text(`${cat.score}/100  (weight: ${Math.round(cat.weight * 100)}%)`, pageW - margin, y, { align: "right" });
    y += 5;

    if (cat.items.length === 0) {
      body("✅ No deductions in this category.", 4, GREEN);
    } else {
      for (const item of cat.items) {
        checkY(10);
        doc.setFillColor(...severityColor(item.severity));
        doc.circle(margin + 2, y - 1.5, 1.5, "F");
        body(`-${item.pointsLost}pt: ${item.description}`, 6, DARK);
        body(`Fix: ${item.fix}`, 10, MUTED);
      }
    }
    y += 3;
  }

  // ══════════════════════════════════════════
  // SECTION 4 — KEYWORD MATCH (if JD provided)
  // ══════════════════════════════════════════
  if (data.keywordReport) {
    heading1("4. Keyword Match Analysis");

    const kr = data.keywordReport;

    checkY(12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(
      `Overall: ${kr.matchRate}%  ·  Required: ${kr.requiredMatchRate}%  ·  Nice-to-have: ${kr.niceToHaveMatchRate}%`,
      margin, y
    );
    y += 8;

    const kwRows = [
      ...kr.matched.map((m) => [
        m.keyword,
        m.isRequired ? "Required" : "Nice-to-have",
        "✅ Matched",
        m.placement === "bullet_with_context" ? "Strong (in bullet)" : "Weak (skills list only)",
        m.context ? `"...${m.context.slice(0, 60)}..."` : "—",
      ]),
      ...kr.missing.map((m) => [
        m.keyword,
        m.isRequired ? "Required" : "Nice-to-have",
        "❌ Missing",
        "—",
        "Not found in resume",
      ]),
    ];

    autoTable(doc, {
      startY: y,
      head: [["Keyword", "Type", "Status", "Placement", "Context"]],
      body: kwRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
      headStyles: { fillColor: INDIGO, textColor: WHITE, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: "bold" },
        1: { cellWidth: 26 },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 32 },
      },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === "body") {
          const val = String(data.cell.raw);
          data.cell.styles.textColor = val.includes("✅") ? GREEN : RED;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ══════════════════════════════════════════
  // SECTION 5 — RAW EXTRACTED TEXT
  // ══════════════════════════════════════════
  heading1(`${data.keywordReport ? "5" : "4"}. Raw Extracted Text (Reading Order)`);

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const textLines = doc.splitTextToSize(
    data.parseResult.bestEffortText.slice(0, 3000) +
    (data.parseResult.bestEffortText.length > 3000 ? "\n[truncated for brevity…]" : ""),
    contentW
  );

  let i = 0;
  while (i < textLines.length) {
    checkY(5);
    doc.text(textLines[i], margin, y);
    y += 4.5;
    i++;
  }

  // ── Footer on every page ──
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const h = doc.internal.pageSize.getHeight();
    doc.setFillColor(248, 249, 255);
    doc.rect(0, h - 10, pageW, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("ATS Checker — ats-checker.app · Parse analysis only. Not a guarantee of ATS pass.", margin, h - 4);
    doc.text(`Page ${p} / ${pageCount}`, pageW - margin, h - 4, { align: "right" });
  }

  doc.save(`ATS_Report_${filename.replace(/\.[^.]+$/, "")}_${Date.now()}.pdf`);
}

// ─── DOCX Export ─────────────────────────────────────────────

export async function exportDOCX(data: AnalysisResponse, filename: string) {
  const {
    Document, Paragraph, TextRun, HeadingLevel, Table, TableRow,
    TableCell, BorderStyle, WidthType, AlignmentType, ShadingType,
    Packer,
  } = await import("docx");
  const { saveAs } = await import("file-saver");

  const { parseResult, rules, keywordReport, scoreBreakdown } = data;

  const hr = () =>
    new Paragraph({
      border: { bottom: { color: "6366F1", size: 6, style: BorderStyle.SINGLE } },
      spacing: { after: 120 },
    });

  const h1 = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text, color: "6366F1", bold: true })],
      spacing: { before: 280, after: 120 },
    });

  const h2 = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text, bold: true })],
      spacing: { before: 200, after: 80 },
    });

  const p = (text: string, options?: { bold?: boolean; color?: string; italic?: boolean }) =>
    new Paragraph({
      children: [
        new TextRun({
          text,
          bold: options?.bold,
          color: options?.color,
          italics: options?.italic,
          size: 20,
        }),
      ],
      spacing: { after: 60 },
    });

  const kv = (label: string, value: string) =>
    new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 20 }),
        new TextRun({ text: value, size: 20 }),
      ],
      spacing: { after: 60 },
    });

  const bullet = (text: string) =>
    new Paragraph({
      bullet: { level: 0 },
      children: [new TextRun({ text, size: 20 })],
      spacing: { after: 40 },
    });

  const tableHeader = (cells: string[]) =>
    new TableRow({
      tableHeader: true,
      children: cells.map(
        (c) =>
          new TableCell({
            shading: { type: ShadingType.SOLID, color: "6366F1" },
            children: [
              new Paragraph({
                children: [new TextRun({ text: c, bold: true, color: "FFFFFF", size: 18 })],
              }),
            ],
          })
      ),
    });

  const tableRow = (cells: string[]) =>
    new TableRow({
      children: cells.map(
        (c) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: c, size: 18 })] })],
          })
      ),
    });

  // ── Build document ──
  const sections: any[] = [];

  // COVER
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: "ATS Analysis Report", bold: true, size: 52, color: "6366F1" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Resume: ${filename}`, size: 24, color: "444466" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, size: 20, color: "888899" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Overall Score: ${scoreBreakdown.overall}/100  —  ${scoreBreakdown.estimatedLabel}`, bold: true, size: 28, color: "10B981" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    hr(),
  );

  // 1. ENTITIES
  sections.push(h1("1. Extracted Contact & Entities"));
  const { entities } = parseResult;
  sections.push(
    kv("Name", entities.name.value || "Not found"),
    kv("Email", entities.email.value || "Not found"),
    kv("Phone", entities.phone.value || "Not found"),
    kv("Links", entities.links.join(", ") || "None"),
    kv("Skills", entities.skills.join(", ") || "None"),
  );
  sections.push(h2("Detected Sections"));
  for (const s of parseResult.sections) {
    sections.push(bullet(`${s.name.toUpperCase()} — found as "${s.rawHeading}" (Page ${s.startPage}, ${Math.round(s.confidence * 100)}% confidence)`));
  }
  sections.push(hr());

  // 2. RULES
  sections.push(h1("2. Formatting Rules & Issues"));
  if (rules.length === 0) {
    sections.push(p("✅ No formatting issues detected — perfect formatting!", { color: "10B981", bold: true }));
  } else {
    for (const rule of [...rules].sort((a, b) => {
      const w = { critical: 3, warning: 2, info: 1 };
      return w[b.severity] - w[a.severity];
    })) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${rule.severity.toUpperCase()}] `,
              bold: true,
              color: rule.severity === "critical" ? "EF4444" : rule.severity === "warning" ? "F59E0B" : "6366F1",
              size: 20,
            }),
            new TextRun({ text: rule.message, bold: true, size: 20 }),
            new TextRun({ text: ` (−${rule.pointsLost} pts)`, color: "888888", size: 18 }),
          ],
          spacing: { before: 120, after: 40 },
        }),
        p(rule.explanation, { color: "555566" }),
        p(`🛠 Fix: ${rule.fix}`, { italic: true, color: "444455" }),
      );
    }
  }
  sections.push(hr());

  // 3. SCORE BREAKDOWN
  sections.push(h1("3. Score Breakdown"));
  sections.push(p(`Overall: ${scoreBreakdown.overall}/100 — ${scoreBreakdown.estimatedLabel}`, { bold: true, color: "6366F1" }));
  const cats = [
    scoreBreakdown.parseIntegrity,
    scoreBreakdown.formattingRisks,
    scoreBreakdown.bulletQuality,
    ...(scoreBreakdown.keywordCoverage ? [scoreBreakdown.keywordCoverage] : []),
    ...(scoreBreakdown.experienceRelevance ? [scoreBreakdown.experienceRelevance] : []),
  ];
  for (const cat of cats) {
    sections.push(h2(`${cat.name}: ${cat.score}/100`));
    if (cat.items.length === 0) {
      sections.push(bullet("No deductions — perfect score in this category"));
    } else {
      for (const item of cat.items) {
        sections.push(bullet(`−${item.pointsLost}pt: ${item.description} → Fix: ${item.fix}`));
      }
    }
  }
  sections.push(hr());

  // 4. KEYWORD MATCH
  if (keywordReport) {
    sections.push(h1("4. Keyword Match Analysis"));
    sections.push(
      p(`Match Rate: ${keywordReport.matchRate}% overall · Required: ${keywordReport.requiredMatchRate}% · Nice-to-have: ${keywordReport.niceToHaveMatchRate}%`, { bold: true })
    );

    sections.push(h2("Matched Keywords"));
    for (const m of keywordReport.matched) {
      sections.push(bullet(`✅ ${m.keyword} [${m.isRequired ? "Required" : "Nice-to-have"}] — ${m.placement === "bullet_with_context" ? "Strong (in bullet)" : "Weak (skills list only)"}`));
    }

    sections.push(h2("Missing Keywords"));
    for (const m of keywordReport.missing) {
      sections.push(bullet(`❌ ${m.keyword} [${m.isRequired ? "Required" : "Nice-to-have"}]`));
    }
    sections.push(hr());
  }

  // 5. RAW TEXT
  sections.push(h1(`${keywordReport ? "5" : "4"}. Raw Extracted Text (Reading Order)`));
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: parseResult.bestEffortText.slice(0, 5000) +
            (parseResult.bestEffortText.length > 5000 ? "\n[truncated…]" : ""),
          font: "Courier New",
          size: 16,
          color: "555566",
        }),
      ],
    })
  );

  // ── Assemble ──
  const doc = new Document({
    creator: "ATS Checker",
    title: `ATS Analysis Report — ${filename}`,
    description: "Transparent ATS resume parse and keyword analysis",
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `ATS_Report_${filename.replace(/\.[^.]+$/, "")}_${Date.now()}.docx`);
}
