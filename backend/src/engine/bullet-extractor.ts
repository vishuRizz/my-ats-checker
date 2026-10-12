// ============================================================
// Bullet Extractor - pulls experience bullets from ParseResult
// ============================================================

import type { Section } from "../engine/types.js";

export interface ExtractedBullet {
  text: string;
  sectionName: string;
  index: number; // position within the section
}

const BULLET_MARKERS = /^[\s]*[•·▪▸→\-–—*◦▷►]\s+/;
const NUMBERED = /^[\s]*\d+[.)]\s+/;

export function extractBullets(parseResult: { sections: Array<Pick<Section, "name" | "text">> }): ExtractedBullet[] {
  const bullets: ExtractedBullet[] = [];

  const targetSections = ["experience", "projects", "achievements", "summary"];

  for (const section of parseResult.sections) {
    if (!targetSections.includes(section.name)) continue;

    const lines = section.text.split("\n");
    let bulletIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const isBullet = BULLET_MARKERS.test(line) || NUMBERED.test(line);
      const isLongSentence = trimmed.length > 40 && trimmed.split(" ").length > 7;

      if (isBullet || (isLongSentence && section.name === "summary")) {
        const cleaned = trimmed
          .replace(BULLET_MARKERS, "")
          .replace(NUMBERED, "")
          .trim();

        if (cleaned.length > 20) {
          bullets.push({
            text: cleaned,
            sectionName: section.name,
            index: bulletIndex++,
          });
        }
      }
    }
  }

  return bullets;
}
