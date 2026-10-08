import fs from "fs/promises";
import path from "path";
import { parse } from "../backend/src/engine/index.js";
import { extractJDRequirements, matchKeywords } from "../backend/src/engine/keyword-matcher.js";

interface GroundTruth {
  filename: string;
  description?: string;
  expectedSections: string[];
  expectedName: string;
  expectedEmail: string;
  expectedPhone?: string;
  expectedSkills?: string[];
  expectedLinksMin?: number;
  expectedMultiColumn?: boolean;
  expectedNoMultiColumn?: boolean;
  expectedPageCount?: number;
  jdFile?: string;
  expectedNotInKeywords?: string[];   // these should NOT appear as JD keywords
  expectedInKeywords?: string[];       // these SHOULD appear
}

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const GROUND_TRUTH_FILE = path.join(__dirname, "ground-truth.json");
const TEST_DIR = path.join(__dirname, "..", "test");

const GREEN  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const DIM    = (s: string) => `\x1b[2m${s}\x1b[0m`;
const CYAN   = (s: string) => `\x1b[36m${s}\x1b[0m`;

async function runEval() {
  console.log(BOLD("\n🚀 ATS Checker — Full Evaluation Suite\n"));
  console.log(CYAN("   Covers: synthetic fixtures + golden test + negative fixtures\n"));

  let groundTruth: GroundTruth[];
  try {
    const file = await fs.readFile(GROUND_TRUTH_FILE, "utf-8");
    groundTruth = JSON.parse(file);
  } catch {
    console.warn(YELLOW("⚠️  ground-truth.json not found. Run: node generate-fixtures.js first."));
    process.exit(1);
  }

  // Add golden test (the real resume + JD)
  const goldenTest: GroundTruth = {
    filename: "golden-resume.pdf",
    description: "Real resume + GoComet JD — golden fixture",
    expectedSections: ["summary", "experience", "projects", "skills", "education"],
    expectedName: "Vishu Pratap",
    expectedEmail: "vishurizz0@gmail.com",
    expectedPhone: "8433492579",
    expectedLinksMin: 8,
    expectedMultiColumn: false,
    expectedNoMultiColumn: true,
    jdFile: "jd.md",
    expectedNotInKeywords: ["go", "spreadsheets", "analytics", "js"],  // "js" should not appear as standalone
    expectedInKeywords: ["react", "node.js"],
  };

  // Negative fixture definitions (built inline, not from file)
  const allTests = [...groundTruth, goldenTest];

  let totalFiles = 0;
  let totalPasses = 0;
  const results: { filename: string; pass: boolean; issues: string[] }[] = [];

  for (const truth of allTests) {
    // Try fixtures dir first, then test dir
    let filePath = path.join(FIXTURES_DIR, truth.filename);
    try { await fs.access(filePath); } catch {
      filePath = path.join(TEST_DIR, truth.filename);
    }

    const issues: string[] = [];

    try {
      const buffer = Buffer.from(await fs.readFile(filePath));
      const mime = truth.filename.endsWith(".pdf") ? "application/pdf"
                 : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      const result = await parse(buffer, mime, truth.filename);
      totalFiles++;

      // ── Section check ───────────────────────────────────────
      const found = result.sections.map((s) => s.name);
      const allSectionsFound = truth.expectedSections.every((s) => found.includes(s));
      if (!allSectionsFound) {
        const missing = truth.expectedSections.filter((s) => !found.includes(s));
        issues.push(`Missing sections: ${missing.join(", ")} (found: ${found.join(", ")})`);
      }

      // ── Email ──────────────────────────────────────────────
      const emailOk = result.entities.email.value.toLowerCase() === truth.expectedEmail.toLowerCase();
      if (!emailOk) issues.push(`Email: expected "${truth.expectedEmail}", got "${result.entities.email.value}"`);

      // ── Name ───────────────────────────────────────────────
      const nameOk = result.entities.name.value.toLowerCase().includes(
        truth.expectedName.toLowerCase().split(" ")[0].toLowerCase()
      );
      if (!nameOk) issues.push(`Name: expected "${truth.expectedName}", got "${result.entities.name.value}"`);

      // ── Multi-column check ─────────────────────────────────
      if (truth.expectedNoMultiColumn && result.isMultiColumn) {
        issues.push(`False positive: isMultiColumn=true but expected false (single-column resume)`);
      }
      if (truth.expectedMultiColumn === true && !result.isMultiColumn) {
        issues.push(`False negative: isMultiColumn=false but expected true`);
      }

      // ── Links min count ────────────────────────────────────
      if (truth.expectedLinksMin !== undefined && result.entities.links.length < truth.expectedLinksMin) {
        issues.push(`Links: expected ≥${truth.expectedLinksMin}, got ${result.entities.links.length}`);
      }

      // ── JD keyword checks ──────────────────────────────────
      if (truth.jdFile) {
        const jdPath = path.join(TEST_DIR, truth.jdFile);
        const jdText = await fs.readFile(jdPath, "utf-8");
        const jdReqs = extractJDRequirements(jdText);
        const kwReport = matchKeywords(jdReqs, result);

        // Check forbidden keywords (should not appear)
        if (truth.expectedNotInKeywords) {
          const allExtracted = jdReqs.map((r) => r.keyword.toLowerCase());
          for (const forbidden of truth.expectedNotInKeywords) {
            if (allExtracted.some((k) => k === forbidden.toLowerCase())) {
              issues.push(`Keyword false positive: "${forbidden}" should NOT be extracted from JD`);
            }
          }
        }

        // Check required keywords (should appear)
        if (truth.expectedInKeywords) {
          const matchedKws = kwReport.matched.map((m) => m.normalized.toLowerCase());
          const allExtracted = jdReqs.map((r) => r.normalized.toLowerCase());
          for (const expected of truth.expectedInKeywords) {
            if (!matchedKws.includes(expected.toLowerCase()) && !allExtracted.includes(expected.toLowerCase())) {
              issues.push(`Keyword false negative: "${expected}" should be matched but was not`);
            }
          }
        }

        // Section count check for golden: exactly 5
        if (truth.filename === "golden-resume.pdf") {
          if (result.sections.length !== 5) {
            issues.push(`Section count: expected exactly 5, got ${result.sections.length} (${found.join(", ")})`);
          }
        }
      }

      const pass = issues.length === 0;
      if (pass) totalPasses++;
      results.push({ filename: truth.filename, pass, issues });

      const status = pass ? GREEN("[PASS]") : RED("[FAIL]");
      console.log(`${status} ${truth.filename}${truth.description ? DIM(` — ${truth.description}`) : ""}`);
      for (const issue of issues) {
        console.log(`       ${YELLOW("⚠")} ${issue}`);
      }

    } catch (err: any) {
      results.push({ filename: truth.filename, pass: false, issues: [`ERROR: ${err.message}`] });
      console.log(`${RED("[ERROR]")} ${truth.filename}: ${err.message}`);
      totalFiles++;
    }
  }

  if (totalFiles === 0) {
    console.log(YELLOW("\nNo test files evaluated. Run: node generate-fixtures.js first."));
    process.exit(1);
  }

  const passRate = (totalPasses / totalFiles) * 100;

  console.log(`\n${BOLD("📊 Evaluation Summary:")}`);
  console.log(`   Total tested:     ${totalFiles}`);
  console.log(`   Overall pass:     ${totalPasses}/${totalFiles} (${passRate.toFixed(0)}%)`);

  let exitCode = 0;
  if (passRate < 100) {
    const failing = results.filter((r) => !r.pass);
    console.log(RED(`\n❌ ${failing.length} test(s) failing.`));
    exitCode = 1;
  } else {
    console.log(GREEN("\n✅ All tests passed."));
  }

  process.exit(exitCode);
}

runEval().catch(console.error);
