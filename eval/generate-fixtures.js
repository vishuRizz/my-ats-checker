#!/usr/bin/env node
// ============================================================
// Eval Fixture Generator — v2
// Creates synthetic PDF and DOCX resume fixtures for the eval set.
// Uses only synthetic data — no real PII. (PRD §11)
// Run: node generate-fixtures.js
// ============================================================
"use strict";

const fs = require("fs");
const path = require("path");

const FIXTURES_DIR = path.join(__dirname, "fixtures");
if (!fs.existsSync(FIXTURES_DIR)) fs.mkdirSync(FIXTURES_DIR, { recursive: true });

// ─── Minimal PDF builder (text-only, text-based PDF 1.4) ───────
function buildPDF(pages) {
  const objects = [];
  let objId = 1;

  const addObj = (content) => {
    const id = objId++;
    objects.push({ id, content });
    return id;
  };

  addObj(`<< /Type /Catalog /Pages 2 0 R >>`); // 1
  addObj(null);                                  // 2 — pages dict placeholder
  const fontId = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);

  const pageIds = pages.map((lines) => {
    const ops = lines.map((line, i) => {
      const y = 750 - i * 16;
      const safe = line
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
      const fontSize = i === 0 ? 14 : 11;
      return `BT /F1 ${fontSize} Tf 50 ${y} Td (${safe}) Tj ET`;
    }).join("\n");
    const streamId = addObj(
      `<< /Length ${ops.length} >>\nstream\n${ops}\nendstream`
    );
    return addObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
  });

  // Fill pages dict
  objects[1].content = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets = [];
  for (const obj of objects) {
    offsets.push(out.length);
    out += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
  }
  const xrefOffset = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    out += String(offset).padStart(10, "0") + " 00000 n \n";
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

// ─── Minimal DOCX builder (valid Office Open XML zip) ──────────
// A DOCX is a zip containing:
//   [Content_Types].xml
//   word/document.xml
//   word/_rels/document.xml.rels
//   _rels/.rels
function buildDOCX(paragraphs) {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  const bodyContent = paragraphs.map((p) => {
    const escaped = p
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<w:p><w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
  }).join("\n    ");

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyContent}
  </w:body>
</w:document>`;

  // Build a real zip using raw zip format
  return buildZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "word/_rels/document.xml.rels", data: wordRels },
    { name: "word/document.xml", data: document },
  ]);
}

// ─── Minimal ZIP builder (no compression — store only) ─────────
function buildZip(entries) {
  const localHeaders = [];
  const centralDir = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const dataBytes = Buffer.from(entry.data, "utf8");
    const crc = crc32(dataBytes);

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);  // signature
    localHeader.writeUInt16LE(20, 4);           // version needed
    localHeader.writeUInt16LE(0, 6);            // flags
    localHeader.writeUInt16LE(0, 8);            // compression: store
    localHeader.writeUInt16LE(0, 10);           // mod time
    localHeader.writeUInt16LE(0, 12);           // mod date
    localHeader.writeUInt32LE(crc, 14);         // crc32
    localHeader.writeUInt32LE(dataBytes.length, 18); // compressed size
    localHeader.writeUInt32LE(dataBytes.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBytes.length, 26); // name length
    localHeader.writeUInt16LE(0, 28);           // extra length
    nameBytes.copy(localHeader, 30);

    const headerAndData = Buffer.concat([localHeader, dataBytes]);
    localHeaders.push(headerAndData);

    // Central directory entry
    const cdEntry = Buffer.alloc(46 + nameBytes.length);
    cdEntry.writeUInt32LE(0x02014b50, 0); // signature
    cdEntry.writeUInt16LE(20, 4);         // version made
    cdEntry.writeUInt16LE(20, 6);         // version needed
    cdEntry.writeUInt16LE(0, 8);          // flags
    cdEntry.writeUInt16LE(0, 10);         // compression
    cdEntry.writeUInt16LE(0, 12);         // mod time
    cdEntry.writeUInt16LE(0, 14);         // mod date
    cdEntry.writeUInt32LE(crc, 16);       // crc32
    cdEntry.writeUInt32LE(dataBytes.length, 20); // compressed
    cdEntry.writeUInt32LE(dataBytes.length, 24); // uncompressed
    cdEntry.writeUInt16LE(nameBytes.length, 28); // name len
    cdEntry.writeUInt16LE(0, 30);         // extra len
    cdEntry.writeUInt16LE(0, 32);         // comment len
    cdEntry.writeUInt16LE(0, 34);         // disk start
    cdEntry.writeUInt16LE(0, 36);         // internal attr
    cdEntry.writeUInt32LE(0, 38);         // external attr
    cdEntry.writeUInt32LE(offset, 42);    // local header offset
    nameBytes.copy(cdEntry, 46);

    centralDir.push(cdEntry);
    offset += headerAndData.length;
  }

  const cdStart = offset;
  const cdBuffer = Buffer.concat(centralDir);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4);          // disk number
  eocd.writeUInt16LE(0, 6);          // cd disk
  eocd.writeUInt16LE(entries.length, 8);  // entries on disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(cdBuffer.length, 12); // cd size
  eocd.writeUInt32LE(cdStart, 16);   // cd offset
  eocd.writeUInt16LE(0, 20);         // comment len

  return Buffer.concat([...localHeaders, cdBuffer, eocd]);
}

// ─── CRC-32 ────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── Synthetic Resume Content ─────────────────────────────────

const PDF_FIXTURES = [
  {
    filename: "single-col-software-engineer.pdf",
    pages: [
      [
        "Jane Doe",
        "jane.doe@example.com | 555-123-4567 | github.com/janedoe",
        "",
        "EXPERIENCE",
        "Senior Frontend Engineer - Acme Corp  (Jan 2021 - Present)",
        "  Built React and TypeScript dashboards serving 50k+ users",
        "  Reduced page load time by 40% using code splitting",
        "  Led migration from Redux to Zustand cutting bundle 20%",
        "Software Engineer - StartupXYZ  (Mar 2018 - Dec 2020)",
        "  Developed Node.js REST APIs consumed by mobile apps",
        "  Integrated PostgreSQL databases with Drizzle ORM",
        "",
        "EDUCATION",
        "B.S. Computer Science - State University  (2018)",
        "",
        "SKILLS",
        "React, TypeScript, Node.js, PostgreSQL, AWS, Docker, Git",
      ],
    ],
  },
  {
    filename: "senior-engineer-resume.pdf",
    pages: [
      [
        "Jordan Smith",
        "jordan.smith@tech.com | 555-222-3333 | linkedin.com/in/jordansmith",
        "",
        "SUMMARY",
        "Staff Software Engineer with 10 years of experience in distributed systems.",
        "",
        "EXPERIENCE",
        "Staff Engineer - BigTech Inc  (2020 - Present)",
        "  Architected Kubernetes-based deployment platform for 200+ microservices",
        "  Reduced infrastructure costs by 35% via AWS spot instance optimization",
        "  Mentored team of 8 engineers across 3 time zones",
        "",
        "Senior Engineer - MidCo  (2016 - 2020)",
        "  Built Go-based event streaming pipeline processing 2M events per sec",
        "  Designed TypeScript SDK adopted by 500+ enterprise customers",
      ],
      [
        "EDUCATION",
        "M.S. Computer Science - Tech University  (2014)",
        "B.S. Computer Science - State University  (2012)",
        "",
        "SKILLS",
        "Kubernetes, AWS, TypeScript, Go, PostgreSQL, Redis, Docker, Terraform",
        "",
        "CERTIFICATIONS",
        "AWS Solutions Architect Professional (2022)",
        "Certified Kubernetes Administrator (2021)",
      ],
    ],
  },
  {
    filename: "minimal-resume.pdf",
    pages: [
      [
        "Sam Taylor",
        "sam.taylor@gmail.com",
        "",
        "EXPERIENCE",
        "Junior Developer - LocalAgency  (2023 - Present)",
        "  Built landing pages using JavaScript and React",
        "  Maintained WordPress sites for small business clients",
        "",
        "SKILLS",
        "JavaScript, React, HTML, CSS, WordPress",
      ],
    ],
  },
  {
    filename: "two-col-designer.pdf",
    pages: [
      [
        "Alex Rivera",
        "alex.rivera@email.com | 555-987-6543",
        "",
        "EXPERIENCE",
        "UI/UX Designer - DesignStudio  (2021 - Present)",
        "  Designed end-to-end user flows for fintech mobile app",
        "  Created component library in Figma used by 6 dev teams",
        "",
        "EDUCATION",
        "B.A. Graphic Design - Art College  (2021)",
        "",
        "SKILLS",
        "Figma, CSS, HTML, Adobe XD, Sketch, Prototyping, User Research",
      ],
    ],
  },
];

const DOCX_FIXTURE = {
  filename: "simple-docx-resume.docx",
  paragraphs: [
    "Morgan Chen",
    "morgan.chen@company.com | 555-456-7890",
    "",
    "EXPERIENCE",
    "Data Analyst - DataCorp   (2022 - Present)",
    "Analysed 5M row datasets using Python and Pandas",
    "Built automated reporting pipelines with AWS Lambda",
    "Created SQL dashboards for executive team",
    "",
    "EDUCATION",
    "B.S. Statistics - University of Science   (2022)",
    "",
    "SKILLS",
    "Python, SQL, AWS, Tableau, Excel, Pandas, NumPy",
  ],
};

async function generate() {
  console.log("🔧 Generating synthetic eval fixtures...\n");

  for (const fixture of PDF_FIXTURES) {
    const filepath = path.join(FIXTURES_DIR, fixture.filename);
    const buf = buildPDF(fixture.pages);
    fs.writeFileSync(filepath, buf);
    console.log(`  ✅ ${fixture.filename} (${buf.length} bytes)`);
  }

  const docxPath = path.join(FIXTURES_DIR, DOCX_FIXTURE.filename);
  const docxBuf = buildDOCX(DOCX_FIXTURE.paragraphs);
  fs.writeFileSync(docxPath, docxBuf);
  console.log(`  ✅ ${DOCX_FIXTURE.filename} (${docxBuf.length} bytes, real DOCX zip)`);

  console.log(`\n✅ All ${PDF_FIXTURES.length + 1} fixtures written to ${FIXTURES_DIR}`);
  console.log(`\nNext: cd eval && npx tsx runner.ts`);
}

generate().catch(console.error);
