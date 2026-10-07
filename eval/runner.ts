import fs from "fs/promises";
import path from "path";
// Import the parsing logic from the backend
import { parse } from "../backend/src/engine/index";

interface GroundTruth {
  filename: string;
  expectedSections: string[];
  expectedName: string;
  expectedEmail: string;
}

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const GROUND_TRUTH_FILE = path.join(__dirname, "ground-truth.json");

async function runEval() {
  console.log("🚀 Starting Parsing Evaluation...");

  let groundTruth: GroundTruth[];
  try {
    const file = await fs.readFile(GROUND_TRUTH_FILE, "utf-8");
    groundTruth = JSON.parse(file);
  } catch (err) {
    console.warn("⚠️  Could not read ground-truth.json. Creating placeholder.");
    await fs.writeFile(
      GROUND_TRUTH_FILE,
      JSON.stringify(
        [
          {
            filename: "synthetic-resume-1.pdf",
            expectedSections: ["experience", "education", "skills"],
            expectedName: "Jane Doe",
            expectedEmail: "jane.doe@example.com",
          },
        ],
        null,
        2
      )
    );
    console.log("Please add PDF/DOCX files to /eval/fixtures and configure ground-truth.json");
    return;
  }

  let totalFiles = 0;
  let sectionSuccesses = 0;
  let emailSuccesses = 0;

  for (const truth of groundTruth) {
    const filePath = path.join(FIXTURES_DIR, truth.filename);
    try {
      const buffer = await fs.readFile(filePath);
      
      const mime = truth.filename.endsWith(".pdf") 
        ? "application/pdf" 
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        
      const result = await parse(buffer, mime, truth.filename);
      totalFiles++;

      // Evaluate sections
      const extractedSections = result.sections.map((s) => s.name);
      const allSectionsFound = truth.expectedSections.every((s) => extractedSections.includes(s));
      if (allSectionsFound) sectionSuccesses++;

      // Evaluate email
      const emailFound = result.entities.email.value === truth.expectedEmail;
      if (emailFound) emailSuccesses++;

      console.log(`[${allSectionsFound && emailFound ? "PASS" : "FAIL"}] ${truth.filename}`);
      if (!allSectionsFound) {
        console.log(`  Expected sections: ${truth.expectedSections.join(", ")}`);
        console.log(`  Found sections:    ${extractedSections.join(", ")}`);
      }
    } catch (err: any) {
      console.log(`[ERROR] ${truth.filename}: ${err.message}`);
    }
  }

  if (totalFiles === 0) {
    console.log("No test files evaluated. Please add files to the fixtures directory.");
    return;
  }

  const sectionAccuracy = (sectionSuccesses / totalFiles) * 100;
  const emailAccuracy = (emailSuccesses / totalFiles) * 100;

  console.log("\n📊 Evaluation Summary:");
  console.log(`- Total Files Tested:   ${totalFiles}`);
  console.log(`- Section Accuracy:     ${sectionAccuracy.toFixed(1)}%`);
  console.log(`- Contact/Email Acc.:   ${emailAccuracy.toFixed(1)}%`);

  if (sectionAccuracy < 90) {
    console.error("❌ Section accuracy fell below the 90% threshold! See PRD Section 6.2.");
    process.exit(1);
  }
}

runEval().catch(console.error);
