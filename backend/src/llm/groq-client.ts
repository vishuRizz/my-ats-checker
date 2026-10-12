// ============================================================
// Groq Client - Round-robin across up to 4 API keys
// Falls back to next key on rate limit (429) or error
// ============================================================

const GROQ_KEYS = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3,
  process.env.GROQ_KEY_4,
].filter((k): k is string => Boolean(k));

if (GROQ_KEYS.length === 0) {
  console.warn("[groq-client] No GROQ_KEY_x env vars set. LLM features will be unavailable.");
}

let _idx = 0;

export function getGroqKey(): string | null {
  if (GROQ_KEYS.length === 0) return null;
  const key = GROQ_KEYS[_idx % GROQ_KEYS.length];
  _idx++;
  return key;
}

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqResponse {
  choices: { message: { content: string } }[];
}

/**
 * Call Groq chat completions API with automatic key rotation.
 * Retries once with the next key on 429 / 503.
 */
export async function groqChat(
  messages: GroqMessage[],
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: "json_object" | "text" };
  } = {}
): Promise<string> {
  const {
    model = "llama-3.3-70b-versatile",
    temperature = 0.3,
    max_tokens = 2048,
    response_format = { type: "json_object" },
  } = options;

  let lastError: Error | null = null;

  // Try up to 2 keys
  for (let attempt = 0; attempt < Math.min(2, Math.max(GROQ_KEYS.length, 1)); attempt++) {
    const key = getGroqKey();
    if (!key) throw new Error("No Groq API keys configured. Add GROQ_KEY_1 to .env");

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
          response_format,
        }),
      });

      if (res.status === 429 || res.status === 503) {
        // Rate limited - try next key
        lastError = new Error(`Groq rate limit on attempt ${attempt + 1}`);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Groq API error ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as GroqResponse;
      return data.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      if (err.message?.includes("rate limit") || err.message?.includes("429")) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("All Groq keys exhausted");
}
