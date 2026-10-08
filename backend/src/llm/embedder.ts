// ============================================================
// Embedder - Uses Xenova/transformers for local embeddings
// No API cost, deterministic, runs in-process.
// ============================================================

// Use a small, fast model suitable for semantic similarity
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

let embedder: any = null;

async function getEmbedder(): Promise<any> {
  if (!embedder) {
    const { pipeline } = await import("@xenova/transformers");
    // Note: In production, you might want to configure cache_dir
    embedder = await pipeline("feature-extraction", MODEL_NAME, {
      quantized: true, // Use quantized model for smaller memory footprint and faster inference
    });
  }
  return embedder;
}

/**
 * Generate an embedding for a given text.
 * Returns a 384-dimensional vector (Float32Array converted to number array).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const extractor = await getEmbedder();
  
  // pooling: 'mean' and normalize: true are standard for sentence transformers
  const output = await extractor(text, { pooling: "mean", normalize: true });
  
  // output.data is a Float32Array, convert to regular array for db/json
  return Array.from(output.data);
}

/**
 * Batch generate embeddings.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  const extractor = await getEmbedder();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  
  const results: number[][] = [];
  // The output is a flat Float32Array, we need to chunk it by the model's dimension (384)
  const dims = 384; 
  for (let i = 0; i < texts.length; i++) {
    const start = i * dims;
    const end = start + dims;
    results.push(Array.from(output.data.slice(start, end)));
  }
  
  return results;
}
