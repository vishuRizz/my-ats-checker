// ============================================================
// Semantic Matcher — Computes cosine similarity between JD 
// keywords and Resume entities/skills
// ============================================================

import { getEmbedding, getEmbeddings } from "./embedder.js";

export interface SemanticMatch {
  jdKeyword: string;
  resumeTerm: string;
  similarity: number;   // 0-1, threshold: 0.78
  matchType: "semantic";
}

const SEMANTIC_THRESHOLD = 0.78;

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Perform semantic matching between missing JD keywords and extracted resume skills.
 * We only compare missing keywords to avoid redundant semantic matches for exact matches.
 */
export async function findSemanticMatches(
  missingJdKeywords: string[],
  resumeSkills: string[] // This should include extracted skills and maybe normalized entities
): Promise<SemanticMatch[]> {
  if (missingJdKeywords.length === 0 || resumeSkills.length === 0) return [];

  const matches: SemanticMatch[] = [];
  
  // Embed all missing JD keywords and resume skills
  // In a production scenario, we'd cache these or look them up from pgvector
  // But doing it on the fly is fast enough with local Xenova for small arrays
  try {
    const jdEmbeddings = await getEmbeddings(missingJdKeywords);
    const skillEmbeddings = await getEmbeddings(resumeSkills);

    for (let i = 0; i < missingJdKeywords.length; i++) {
      let bestMatchIdx = -1;
      let highestSim = -1;

      for (let j = 0; j < resumeSkills.length; j++) {
        const sim = cosineSimilarity(jdEmbeddings[i], skillEmbeddings[j]);
        if (sim > highestSim) {
          highestSim = sim;
          bestMatchIdx = j;
        }
      }

      if (highestSim >= SEMANTIC_THRESHOLD) {
        matches.push({
          jdKeyword: missingJdKeywords[i],
          resumeTerm: resumeSkills[bestMatchIdx],
          similarity: Number(highestSim.toFixed(2)),
          matchType: "semantic",
        });
      }
    }
  } catch (error) {
    console.error("[Semantic Matcher] Error computing semantic matches:", error);
  }

  return matches;
}
