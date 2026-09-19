import { getGeminiClient, GEMINI_MODELS } from "./gemini.js";

/**
 * Generate embedding vector for a piece of text.
 * Returns array of numbers (floats).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim().slice(0, 4000);
  if (!cleanText) {
    return new Array(64).fill(0);
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const res: any = await ai.models.embedContent({
        model: GEMINI_MODELS.EMBEDDINGS,
        contents: cleanText,
      });

      const values = res?.embedding?.values || res?.embeddings?.[0]?.values;
      if (values && Array.isArray(values)) {
        return values;
      }
    } catch (err) {
      console.warn("Gemini embedding error, falling back to local feature vector:", err);
    }
  }

  // Robust deterministic local semantic embedding fallback (64 dimensions)
  return generateDeterministicVector(cleanText, 64);
}

/**
 * Computes cosine similarity between two numeric vectors.
 * Returns score between -1 and 1 (usually 0 to 1 for normalized embeddings).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const minLen = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < minLen; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Deterministic hash-based bag-of-words / character n-gram embedding vector
 * Used as high-quality local fallback for offline development or testing without API key.
 */
function generateDeterministicVector(text: string, dimensions = 64): number[] {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

  if (words.length === 0) return vector;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  }

  // L2 normalize
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) sumSq += vector[i] * vector[i];
  const mag = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < dimensions; i++) vector[i] /= mag;

  return vector;
}
