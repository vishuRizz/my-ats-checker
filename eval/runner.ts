import fs from "fs/promises";
import path from "path";
// Import the parsing logic from the backend
import { parse } from "../backend/src/engine/index";

interface GroundTruth {
  filename: string;
  description?: string;
  expectedSections: string[];
  expectedName: string;
  expectedEmail: string;
  expectedPhone?: string;
  expectedSkills?: string[];
  expectedMultiColumn?: boolean;
  expectedPageCount?: number;
}

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const GROUND_TRUTH_FILE = path.join(__dirname, "ground-truth.json");

// ANSI colors for terminal output
const GREEN  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const DIM    = (s: string) => `\x1b[2m${s}\x1b[0m`;

async function runEval() {
  console.log(BOLD("\n🚀 ATS Checker — Parsing Evaluation Runner\n"));

  let groundTruth: GroundTruth[];
  try {
    const file = await fs.readFile(GROUND_TRUTH_FILE, "utf-8");
    groundTruth = JSON.parse(file);
  } catch (err) {
    console.warn(YELLOW("⚠️  Could not read ground-truth.json. Run: node generate-fixtures.js first."));
    process.exit(1);
  }

  let totalFiles = 0;
  let sectionSuccesses = 0;
  let emailSuccesses = 0;
  let nameSuccesses = 0;

  const results: { filename: string; pass: boolean; issues: string[] }[] = [];

  for (const truth of groundTruth) {
    const filePath = path.join(FIXTURES_DIR, truth.filename);
    const issues: string[] = [];

    try {
      const buffer = Buffer.from(await fs.readFile(filePath));

      const mime = truth.filename.endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      const result = await parse(buffer, mime, truth.filename);
      totalFiles++;

      // ── Section check ─────────────────────────────────────────
      const extractedSections = result.sections.map((s) => s.name);
      const allSectionsFound = truth.expectedSections.every((s) => extractedSections.includes(s));
      if (allSectionsFound) {
        sectionSuccesses++;
      } else {
        const missing = truth.expectedSections.filter((s) => !extractedSections.includes(s));
        issues.push(`Missing sections: ${missing.join(", ")} (found: ${extractedSections.join(", ")})`);
      }

      // ── Email check ───────────────────────────────────────────
      const emailFound = result.entities.email.value.toLowerCase() === truth.expectedEmail.toLowerCase();
      if (emailFound) {
        emailSuccesses++;
      } else {
        issues.push(`Email: expected "${truth.expectedEmail}", got "${result.entities.email.value}"`);
      }

      // ── Name check ────────────────────────────────────────────
      const nameFound = result.entities.name.value.toLowerCase().includes(truth.expectedName.toLowerCase().split(" ")[0].toLowerCase());
      if (nameFound) {
        nameSuccesses++;
      } else {
        issues.push(`Name: expected "${truth.expectedName}", got "${result.entities.name.value}"`);
      }

      // ── Skills spot-check ─────────────────────────────────────
      if (truth.expectedSkills && truth.expectedSkills.length > 0) {
        const extractedSkillsLower = result.entities.skills.map((s) => s.toLowerCase());
        const missingSkills = truth.expectedSkills.filter(
          (sk) => !extractedSkillsLower.some((es) => es.includes(sk.toLowerCase()))
        );
        if (missingSkills.length > 0) {
          issues.push(`Skills missing: ${missingSkills.join(", ")}`);
        }
      }

      // ── Page count check ─────────────────────────────────────
      if (truth.expectedPageCount !== undefined && result.pageCount !== truth.expectedPageCount) {
        issues.push(`Pages: expected ${truth.expectedPageCount}, got ${result.pageCount}`);
      }

      const pass = allSectionsFound && emailFound;
      results.push({ filename: truth.filename, pass, issues });

      const status = pass ? GREEN("[PASS]") : RED("[FAIL]");
      console.log(`${status} ${truth.filename}${truth.description ? DIM(` — ${truth.description}`) : ""}`);
      for (const issue of issues) {
        console.log(`       ${YELLOW("⚠")} ${issue}`);
      }

    } catch (err: any) {
      results.push({ filename: truth.filename, pass: false, issues: [`ERROR: ${err.message}`] });
      console.log(`${RED("[ERROR]")} ${truth.filename}: ${err.message}`);
    }
  }

  if (totalFiles === 0) {
    console.log(YELLOW("\nNo test files evaluated. Run: node generate-fixtures.js first."));
    process.exit(1);
  }

  const sectionAccuracy = (sectionSuccesses / totalFiles) * 100;
  const emailAccuracy   = (emailSuccesses / totalFiles) * 100;
  const nameAccuracy    = (nameSuccesses / totalFiles) * 100;
  const overallPass     = results.filter((r) => r.pass).length;

  console.log(`\n${BOLD("📊 Evaluation Summary:")}`);
  console.log(`   Total files tested:    ${totalFiles}`);
  console.log(`   Overall pass rate:     ${overallPass}/${totalFiles} (${((overallPass/totalFiles)*100).toFixed(0)}%)`);
  console.log(`   Section accuracy:      ${sectionAccuracy.toFixed(1)}%  ${sectionAccuracy >= 90 ? GREEN("✓") : RED("✗ (threshold: 90%)")}`);
  console.log(`   Contact/Email acc.:    ${emailAccuracy.toFixed(1)}%    ${emailAccuracy >= 95 ? GREEN("✓") : RED("✗ (threshold: 95%)")}`);
  console.log(`   Name accuracy:         ${nameAccuracy.toFixed(1)}%`);

  // PRD §6.2 acceptance criteria
  let exitCode = 0;
  if (sectionAccuracy < 90) {
    console.log(RED("\n❌ Section accuracy below 90% threshold (PRD §6.2). Fix before shipping."));
    exitCode = 1;
  }
  if (emailAccuracy < 95) {
    console.log(RED("❌ Contact/Email accuracy below 95% threshold (PRD §6.2)."));
    exitCode = 1;
  }
  if (exitCode === 0) {
    console.log(GREEN("\n✅ All accuracy thresholds met. Eval PASSED."));
  }

  process.exit(exitCode);
}

runEval().catch(console.error);
