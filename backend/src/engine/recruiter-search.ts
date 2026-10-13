// ============================================================
// Recruiter Boolean Search Simulator
// PRD §6.8: Evaluates boolean queries (AND / OR / NOT / quotes / parentheses)
// against the ATS-parsed text of the resume.
// ============================================================

export interface BooleanQueryResult {
  query: string;
  surfaced: boolean;
  matchedTerms: string[];
  missingTerms: string[];
  excludedMatches: string[];
  explanation: string;
}

export function evaluateRecruiterQuery(
  rawQuery: string,
  resumeText: string
): BooleanQueryResult {
  const normalizedText = " " + resumeText.toLowerCase().replace(/\s+/g, " ") + " ";
  const query = rawQuery.trim();

  if (!query) {
    return {
      query: "",
      surfaced: true,
      matchedTerms: [],
      missingTerms: [],
      excludedMatches: [],
      explanation: "Empty search query matches all candidates.",
    };
  }

  // Tokenize and extract search terms for audit reporting
  const termMatches = extractTermsAndTest(query, normalizedText);

  // Evaluate the boolean expression tree
  const surfaced = evaluateBooleanExpression(query, normalizedText);

  let explanation = "";
  if (surfaced) {
    explanation = "Your resume SURFACED! It satisfies all mandatory keywords and avoided all negative filter terms in this recruiter query.";
  } else if (termMatches.excludedMatches.length > 0) {
    explanation = `Your resume was FILTERED OUT because of negative filter terms: "${termMatches.excludedMatches.join(', ')}".`;
  } else if (termMatches.missingTerms.length > 0) {
    explanation = `Your resume was MISSED because it lacks required terms: "${termMatches.missingTerms.join(', ')}".`;
  } else {
    explanation = "Your resume did not satisfy the logical condition of this boolean search query.";
  }

  return {
    query,
    surfaced,
    matchedTerms: termMatches.matchedTerms,
    missingTerms: termMatches.missingTerms,
    excludedMatches: termMatches.excludedMatches,
    explanation,
  };
}

function termExistsInText(term: string, normalizedText: string): boolean {
  const cleanTerm = term.toLowerCase().trim();
  if (!cleanTerm) return false;
  // Word boundary check for short terms, substring for multi-word phrases
  if (cleanTerm.includes(" ")) {
    return normalizedText.includes(` ${cleanTerm} `) || normalizedText.includes(cleanTerm);
  }
  const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(normalizedText);
}

function extractTermsAndTest(query: string, normalizedText: string) {
  const matchedTerms: string[] = [];
  const missingTerms: string[] = [];
  const excludedMatches: string[] = [];

  // Find quoted strings and words
  const regex = /"([^"]+)"|(\bNOT\s+"[^"]+"|\bNOT\s+\w+)|(\b[A-Za-z0-9#+.-]+\b)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(query)) !== null) {
    const raw = match[0];
    if (/^(AND|OR|\(|\))$/i.test(raw)) continue;

    if (/^NOT\s+/i.test(raw)) {
      const excludedTerm = raw.replace(/^NOT\s+/i, "").replace(/"/g, "").trim();
      if (termExistsInText(excludedTerm, normalizedText)) {
        excludedMatches.push(excludedTerm);
      }
    } else {
      const term = (match[1] || match[3] || "").replace(/"/g, "").trim();
      if (!term || /^(AND|OR|NOT)$/i.test(term)) continue;

      if (termExistsInText(term, normalizedText)) {
        if (!matchedTerms.includes(term)) matchedTerms.push(term);
      } else {
        if (!missingTerms.includes(term)) missingTerms.push(term);
      }
    }
  }

  return { matchedTerms, missingTerms, excludedMatches };
}

function evaluateBooleanExpression(query: string, normalizedText: string): boolean {
  try {
    // Replace boolean syntax with JS boolean operators:
    // Quoted strings: "react native" -> exists
    let expr = query;

    // Handle quoted strings
    expr = expr.replace(/"([^"]+)"/g, (_, term) => {
      return termExistsInText(term, normalizedText) ? "true" : "false";
    });

    // Handle NOT operator
    expr = expr.replace(/\bNOT\s+([A-Za-z0-9#+.-]+)/gi, (_, term) => {
      const exists = term === "true" ? true : term === "false" ? false : termExistsInText(term, normalizedText);
      return exists ? "false" : "true";
    });

    // Handle AND / OR
    expr = expr.replace(/\bAND\b/gi, "&&");
    expr = expr.replace(/\bOR\b/gi, "||");

    // Replace remaining bare words with existence checks
    expr = expr.replace(/\b([A-Za-z0-9#+.-]+)\b/g, (match) => {
      if (match === "true" || match === "false" || match === "&&" || match === "||") {
        return match;
      }
      return termExistsInText(match, normalizedText) ? "true" : "false";
    });

    // Safe evaluation of boolean expression containing only true, false, &&, ||, (, ), !
    const sanitized = expr.replace(/[^truefalse&|!()\s]/g, "");
    // eslint-disable-next-line no-new-func
    return Boolean(Function(`"use strict"; return (${sanitized});`)());
  } catch {
    // Fallback if user entered unbalanced parentheses
    return false;
  }
}
