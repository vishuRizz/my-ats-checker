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
  expectedPageCount?: number;
  jdFile?: string;
  expectedNotInKeywords?: string[];
  expectedInKeywords?: string[];
  fixtureTypes?: Array<"single_column" | "multi_column" | "table_docx" | "scanned" | "designer_layout">;
}

interface MetricCounts {
  correct: number;
  total: number;
}

type Metrics = Record<
  "sectionRecall" | "nameAccuracy" | "emailAccuracy" | "phoneAccuracy" |
  "skillRecall" | "pageCountAccuracy" | "multiColumnAccuracy" |
  "multiColumnRecall" | "keywordExpectationAccuracy",
  MetricCounts
>;

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const GROUND_TRUTH_FILE = path.join(__dirname, "ground-truth.json");
const TEST_DIR = path.join(__dirname, "..", "test");
const QUALITY_GATES_FILE = path.join(__dirname, "quality-gates.json");
const reportArgIndex = process.argv.indexOf("--report");
const REPORT_PATH = reportArgIndex >= 0 ? process.argv[reportArgIndex + 1] : undefined;
const STRICT_GATES = process.argv.includes("--strict-gates");

const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`;
const RED = (s: string) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`;
const BOLD = (s: string) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`;
const CYAN = (s: string) => `\x1b[36m${s}\x1b[0m`;

function addMetric(metric: MetricCounts, passed: boolean) {
  metric.total += 1;
  if (passed) metric.correct += 1;
}

function percentage(metric: MetricCounts): number | null {
  return metric.total === 0 ? null : Number(((metric.correct / metric.total) * 100).toFixed(1));
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function validateGroundTruth(fixtures: GroundTruth[]): string[] {
  const issues: string[] = [];
  const fixtureTypes = new Set(["single_column", "multi_column", "table_docx", "scanned", "designer_layout"]);
  for (const [index, fixture] of fixtures.entries()) {
    const label = `ground-truth[${index}]`;
    if (!fixture.filename || !/\.(pdf|docx)$/i.test(fixture.filename)) issues.push(`${label}: filename must be a PDF or DOCX`);
    if (!fixture.expectedName || !fixture.expectedEmail) issues.push(`${label}: expectedName and expectedEmail are required`);
    if (!Array.isArray(fixture.expectedSections) || fixture.expectedSections.length === 0) issues.push(`${label}: expectedSections must not be empty`);
    for (const type of fixture.fixtureTypes ?? []) if (!fixtureTypes.has(type)) issues.push(`${label}: unsupported fixture type "${type}"`);
  }
  return issues;
}

interface QualityGates {
  minimumCoverage: Record<"resumes" | "resumeJobDescriptionPairs" | "multiColumnResumes" | "scannedResumes" | "docxResumes", number>;
  minimumMetrics: Record<string, number>;
}

function evaluateQualityGates(fixtures: GroundTruth[], metrics: Metrics, gates: QualityGates): string[] {
  const countType = (type: NonNullable<GroundTruth["fixtureTypes"]>[number]) =>
    fixtures.filter((fixture) => fixture.fixtureTypes?.includes(type)).length;
  const coverage = {
    resumes: fixtures.length,
    resumeJobDescriptionPairs: fixtures.filter((fixture) => Boolean(fixture.jdFile)).length,
    multiColumnResumes: countType("multi_column"),
    scannedResumes: countType("scanned"),
    docxResumes: fixtures.filter((fixture) => fixture.filename.toLowerCase().endsWith(".docx")).length,
  };
  const failures: string[] = [];
  for (const [name, minimum] of Object.entries(gates.minimumCoverage)) {
    if (coverage[name as keyof typeof coverage] < minimum) failures.push(`Coverage ${name}: expected at least ${minimum}, got ${coverage[name as keyof typeof coverage]}`);
  }
  for (const [name, minimum] of Object.entries(gates.minimumMetrics)) {
    const metric = metrics[name as keyof Metrics];
    const result = metric ? percentage(metric) : null;
    if (result === null || result < minimum) failures.push(`Metric ${name}: expected at least ${minimum}%, got ${result ?? "n/a"}%`);
  }
  return failures;
}

async function fixturePath(filename: string): Promise<string> {
  const pathInFixtures = path.join(FIXTURES_DIR, filename);
  try {
    await fs.access(pathInFixtures);
    return pathInFixtures;
  } catch {
    return path.join(TEST_DIR, filename);
  }
}

async function jobDescriptionPath(filename: string): Promise<string> {
  const pathInFixtures = path.join(FIXTURES_DIR, "jds", filename);
  try {
    await fs.access(pathInFixtures);
    return pathInFixtures;
  } catch {
    return path.join(TEST_DIR, filename);
  }
}

async function runEval() {
  console.log(BOLD("\n🚀 ATS Checker - Evaluation Suite\n"));
  console.log(CYAN("   Quality metrics are calculated from labelled fixtures.\n"));

  const groundTruth = JSON.parse(await fs.readFile(GROUND_TRUTH_FILE, "utf-8")) as GroundTruth[];
  const dataIssues = validateGroundTruth(groundTruth);
  if (dataIssues.length > 0) {
    for (const issue of dataIssues) console.error(RED(`Invalid evaluation data: ${issue}`));
    process.exitCode = 1;
    return;
  }
  const metrics: Metrics = {
    sectionRecall: { correct: 0, total: 0 },
    nameAccuracy: { correct: 0, total: 0 },
    emailAccuracy: { correct: 0, total: 0 },
    phoneAccuracy: { correct: 0, total: 0 },
    skillRecall: { correct: 0, total: 0 },
    pageCountAccuracy: { correct: 0, total: 0 },
    multiColumnAccuracy: { correct: 0, total: 0 },
    multiColumnRecall: { correct: 0, total: 0 },
    keywordExpectationAccuracy: { correct: 0, total: 0 },
  };
  const results: { filename: string; pass: boolean; issues: string[] }[] = [];

  for (const truth of groundTruth) {
    const issues: string[] = [];
    try {
      const buffer = Buffer.from(await fs.readFile(await fixturePath(truth.filename)));
      const mime = truth.filename.endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const result = await parse(buffer, mime, truth.filename);
      const sections = result.sections.map((section) => section.name);

      for (const expected of truth.expectedSections) {
        const found = sections.includes(expected);
        addMetric(metrics.sectionRecall, found);
        if (!found) issues.push(`Missing section: ${expected}`);
      }

      const nameOk = result.entities.name.value.toLowerCase().includes(truth.expectedName.split(" ")[0].toLowerCase());
      addMetric(metrics.nameAccuracy, nameOk);
      if (!nameOk) issues.push(`Name: expected "${truth.expectedName}", got "${result.entities.name.value}"`);

      const emailOk = result.entities.email.value.toLowerCase() === truth.expectedEmail.toLowerCase();
      addMetric(metrics.emailAccuracy, emailOk);
      if (!emailOk) issues.push(`Email: expected "${truth.expectedEmail}", got "${result.entities.email.value}"`);

      if (truth.expectedPhone) {
        const phoneOk = normalizePhone(result.entities.phone.value) === normalizePhone(truth.expectedPhone);
        addMetric(metrics.phoneAccuracy, phoneOk);
        if (!phoneOk) issues.push(`Phone: expected "${truth.expectedPhone}", got "${result.entities.phone.value}"`);
      }

      if (truth.expectedSkills) {
        const detectedSkills = new Set(result.entities.skills.map((skill) => skill.toLowerCase()));
        for (const expected of truth.expectedSkills) {
          const found = detectedSkills.has(expected.toLowerCase());
          addMetric(metrics.skillRecall, found);
          if (!found) issues.push(`Missing skill: ${expected}`);
        }
      }

      if (truth.expectedPageCount !== undefined) {
        const pageCountOk = result.pageCount === truth.expectedPageCount;
        addMetric(metrics.pageCountAccuracy, pageCountOk);
        if (!pageCountOk) issues.push(`Page count: expected ${truth.expectedPageCount}, got ${result.pageCount}`);
      }

      if (truth.expectedMultiColumn !== undefined) {
        const multiColumnOk = result.isMultiColumn === truth.expectedMultiColumn;
        addMetric(metrics.multiColumnAccuracy, multiColumnOk);
        if (truth.expectedMultiColumn) addMetric(metrics.multiColumnRecall, result.isMultiColumn);
        if (!multiColumnOk) issues.push(`Multi-column: expected ${truth.expectedMultiColumn}, got ${result.isMultiColumn}`);
      }

      if (truth.expectedLinksMin !== undefined && result.entities.links.length < truth.expectedLinksMin) {
        issues.push(`Links: expected at least ${truth.expectedLinksMin}, got ${result.entities.links.length}`);
      }

      if (truth.jdFile) {
        const jdText = await fs.readFile(await jobDescriptionPath(truth.jdFile), "utf-8");
        const requirements = extractJDRequirements(jdText);
        const extracted = requirements.map((requirement) => requirement.normalized.toLowerCase());
        const matched = matchKeywords(requirements, result).matched.map((item) => item.normalized.toLowerCase());
        for (const forbidden of truth.expectedNotInKeywords ?? []) {
          const ok = !extracted.includes(forbidden.toLowerCase());
          addMetric(metrics.keywordExpectationAccuracy, ok);
          if (!ok) issues.push(`Unexpected JD keyword: ${forbidden}`);
        }
        for (const expected of truth.expectedInKeywords ?? []) {
          const ok = extracted.includes(expected.toLowerCase()) || matched.includes(expected.toLowerCase());
          addMetric(metrics.keywordExpectationAccuracy, ok);
          if (!ok) issues.push(`Expected JD keyword missing: ${expected}`);
        }
      }
    } catch (error) {
      issues.push(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }

    const pass = issues.length === 0;
    results.push({ filename: truth.filename, pass, issues });
    console.log(`${pass ? GREEN("[PASS]") : RED("[FAIL]")} ${truth.filename}${truth.description ? DIM(` - ${truth.description}`) : ""}`);
    for (const issue of issues) console.log(`       ${YELLOW("⚠")} ${issue}`);
  }

  const totalPasses = results.filter((result) => result.pass).length;
  const summary = { totalFiles: results.length, totalPasses, passRate: Number(((totalPasses / results.length) * 100).toFixed(1)) };
  console.log(`\n${BOLD("📊 Evaluation Summary:")}`);
  console.log(`   Overall pass: ${summary.totalPasses}/${summary.totalFiles} (${summary.passRate}%)`);
  console.log(`\n${BOLD("📐 Quality Metrics:")}`);
  for (const [name, metric] of Object.entries(metrics)) console.log(`   ${name}: ${percentage(metric) ?? "n/a"}%`);

  const gates = JSON.parse(await fs.readFile(QUALITY_GATES_FILE, "utf-8")) as QualityGates;
  const gateFailures = evaluateQualityGates(groundTruth, metrics, gates);
  if (STRICT_GATES) {
    console.log(`\n${BOLD("🚦 Quality Gates:")}`);
    if (gateFailures.length === 0) {
      console.log(GREEN("   All release-quality gates passed."));
    } else {
      for (const failure of gateFailures) console.log(RED(`   ${failure}`));
    }
  }

  if (REPORT_PATH) {
    const report = {
      generatedAt: new Date().toISOString(),
      engine: "backend/src/engine",
      summary,
      metrics: Object.fromEntries(Object.entries(metrics).map(([name, metric]) => [name, { ...metric, percentage: percentage(metric) }])),
      results,
    };
    await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
    await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(DIM(`\nReport written to ${REPORT_PATH}`));
  }

  process.exitCode = totalPasses === results.length && (!STRICT_GATES || gateFailures.length === 0) ? 0 : 1;
}

runEval().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
