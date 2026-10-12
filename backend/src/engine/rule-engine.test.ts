import assert from "node:assert/strict";
import test from "node:test";
import { runRules } from "./rule-engine.js";
import type { ParseResult } from "./types.js";

function makeParseResult(overrides: Partial<ParseResult> = {}): ParseResult {
  return {
    fileType: "pdf",
    pageCount: 1,
    readingOrderText: "",
    bestEffortText: "",
    sections: [
      { name: "experience", rawHeading: "Experience", text: "• Built a reliable service", startPage: 1, confidence: 1 },
      { name: "education", rawHeading: "Education", text: "BSc Computer Science", startPage: 1, confidence: 1 },
      { name: "skills", rawHeading: "Skills", text: "TypeScript", startPage: 1, confidence: 1 },
    ],
    entities: {
      name: { value: "Jane Doe", confidence: 1, sourceBbox: null },
      email: { value: "jane@example.test", confidence: 1 },
      phone: { value: "555-0100", confidence: 1 },
      links: [], experience: [], education: [], skills: ["TypeScript"],
    },
    lostRegions: [],
    warnings: [],
    isImageOnly: false,
    isMultiColumn: false,
    hasHeaderFooterContent: false,
    parserVersion: "test",
    parsabilityRisk: "none",
    parsabilityReason: "",
    textItemCount: 100,
    textToPageRatio: 100,
    ...overrides,
  };
}

function hasRule(result: ParseResult, id: string): boolean {
  return runRules(result).some((rule) => rule.id === id);
}

test("each formatting rule has a positive and negative regression case", async (t) => {
  await t.test("R001 multi-column layout", () => {
    assert.equal(hasRule(makeParseResult({ isMultiColumn: true }), "R001"), true);
    assert.equal(hasRule(makeParseResult(), "R001"), false);
  });

  await t.test("R002 header/footer content", () => {
    assert.equal(hasRule(makeParseResult({ hasHeaderFooterContent: true }), "R002"), true);
    assert.equal(hasRule(makeParseResult(), "R002"), false);
  });

  await t.test("R003 image-only PDF", () => {
    assert.equal(hasRule(makeParseResult({ isImageOnly: true }), "R003"), true);
    assert.equal(hasRule(makeParseResult(), "R003"), false);
  });

  await t.test("R004 missing core section", () => {
    assert.equal(hasRule(makeParseResult({ sections: [] }), "R004"), true);
    assert.equal(hasRule(makeParseResult(), "R004"), false);
  });

  await t.test("R005 unrecognized heading", () => {
    const result = makeParseResult({
      sections: [{ name: "unlabeled", rawHeading: "My Journey", text: "Work history", startPage: 1, confidence: 0.4 }],
    });
    assert.equal(hasRule(result, "R005"), true);
    assert.equal(hasRule(makeParseResult(), "R005"), false);
  });

  await t.test("R006 inconsistent dates", () => {
    assert.equal(hasRule(makeParseResult({ readingOrderText: "Jan 2020 – 01/2022 – 2024" }), "R006"), true);
    assert.equal(hasRule(makeParseResult({ readingOrderText: "Jan 2020 – Feb 2022" }), "R006"), false);
  });

  await t.test("R007 excessive length", () => {
    assert.equal(hasRule(makeParseResult({ pageCount: 4 }), "R007"), true);
    assert.equal(hasRule(makeParseResult({ pageCount: 2 }), "R007"), false);
  });

  await t.test("R008 weak bullets", () => {
    const weakBullets = "• did a task\n• helped a team\n• worked on features";
    assert.equal(hasRule(makeParseResult({ sections: [
      { name: "experience", rawHeading: "Experience", text: weakBullets, startPage: 1, confidence: 1 },
      { name: "education", rawHeading: "Education", text: "BSc", startPage: 1, confidence: 1 },
      { name: "skills", rawHeading: "Skills", text: "TypeScript", startPage: 1, confidence: 1 },
    ] }), "R008"), true);
    assert.equal(hasRule(makeParseResult(), "R008"), false);
  });

  await t.test("R009 missing contact fields", () => {
    const entities = makeParseResult().entities;
    assert.equal(hasRule(makeParseResult({ entities: { ...entities, email: { value: "", confidence: 0 } } }), "R009"), true);
    assert.equal(hasRule(makeParseResult(), "R009"), false);
  });

  await t.test("R010 table layout", () => {
    assert.equal(hasRule(makeParseResult({ warnings: [{ type: "table_layout", message: "Table detected" }] }), "R010"), true);
    assert.equal(hasRule(makeParseResult(), "R010"), false);
  });
});
