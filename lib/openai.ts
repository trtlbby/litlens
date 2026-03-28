import { GoogleGenerativeAI } from "@google/generative-ai";

const globalForGemini = globalThis as unknown as {
  genAI: GoogleGenerativeAI | undefined;
};

export const genAI =
  globalForGemini.genAI ??
  new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

if (process.env.NODE_ENV !== "production") globalForGemini.genAI = genAI;

/**
 * Rate-limit delay for Gemini free tier (15 RPM).
 * 4.5s between calls gives headroom under the 15 RPM cap.
 */
const RATE_LIMIT_DELAY_MS = 4500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── LLM Fallback Chain ───
// Ordered by preference. If one is rate-limited, try the next.
const LLM_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemma-3-12b-it",
];

// ─── Embedding Config ───
// We do NOT fallback embedding models because different models produce
// different vector dimensions/spaces — mixing them breaks similarity search.
// Instead, we retry with backoff on rate limits.
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";

/**
 * Embed a single text string using Gemini embedding model.
 * Returns a 3072-dimensional float array.
 * Retries on rate limits with exponential backoff.
 */
export async function embedText(text: string): Promise<number[]> {
  const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error: unknown) {
      if (isRateLimited(error) && attempt < 2) {
        const backoff = RATE_LIMIT_DELAY_MS * (attempt + 1);
        console.warn(
          `[LitLens] Embedding rate limited — retrying in ${backoff / 1000}s (attempt ${attempt + 1}/3)`
        );
        await sleep(backoff);
        continue;
      }
      throw error;
    }
  }

  throw new Error("Embedding failed after all retries.");
}

/**
 * Embed multiple texts with rate-limiting for Gemini free tier (15 RPM).
 * Processes in batches of 10 via batchEmbedContents with delay between batches.
 * Retries failed batches on rate limits.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const allEmbeddings: number[][] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    if (i > 0) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }

    const batch = texts.slice(i, i + BATCH_SIZE);

    // Retry loop for this batch
    let batchSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await embeddingModel.batchEmbedContents({
          requests: batch.map((text) => ({
            content: { role: "user", parts: [{ text }] },
          })),
        });
        allEmbeddings.push(...result.embeddings.map((e) => e.values));
        batchSuccess = true;
        break;
      } catch (error: unknown) {
        if (isRateLimited(error) && attempt < 2) {
          const backoff = RATE_LIMIT_DELAY_MS * (attempt + 2);
          console.warn(
            `[LitLens] Embedding batch ${i / BATCH_SIZE + 1} rate limited — retrying in ${backoff / 1000}s`
          );
          await sleep(backoff);
          continue;
        }
        throw error;
      }
    }

    if (!batchSuccess) {
      throw new Error(`Embedding batch failed after 3 retries.`);
    }
  }

  return allEmbeddings;
}

/**
 * Generate text using Gemini LLM with fallback chain.
 * If the primary model (gemini-2.5-flash) is rate-limited or returns empty,
 * falls back to flash-lite, then gemma-3-12b-it.
 */
export async function generateText(prompt: string): Promise<string> {
  await sleep(RATE_LIMIT_DELAY_MS); // rate limit pre-delay

  for (const modelName of LLM_FALLBACK_CHAIN) {
    try {
      const llm = genAI.getGenerativeModel({ model: modelName });
      const result = await llm.generateContent(prompt);
      const text = result.response.text();

      // Guard against empty responses (thinking mode can produce these)
      if (!text || text.trim().length === 0) {
        console.warn(
          `[LitLens] ${modelName} returned empty response — trying next model`
        );
        continue;
      }

      return text;
    } catch (error: unknown) {
      if (isRateLimited(error) || isEmptyOutputError(error)) {
        console.warn(
          `[LitLens] ${modelName} ${isRateLimited(error) ? "rate limited" : "empty output"} — trying next model`
        );
        continue; // try next model in chain
      }
      // Non-rate-limit error — don't fallback, throw immediately
      throw error;
    }
  }

  throw new Error(
    "All models in fallback chain failed. Try again later."
  );
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * Check if an error is a rate limit / quota error.
 */
function isRateLimited(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const e = error as { status?: number; message?: string };
    if (e.status === 429) return true;
    if (
      e.message &&
      (e.message.includes("quota") ||
        e.message.includes("rate limit") ||
        e.message.includes("RATE_LIMIT_EXCEEDED") ||
        e.message.includes("RESOURCE_EXHAUSTED"))
    )
      return true;
  }
  return false;
}

/**
 * Check if an error is the Gemini "empty output" error.
 * gemini-2.5-flash's thinking mode can use all tokens on reasoning
 * and produce no output text, throwing this specific error.
 */
function isEmptyOutputError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const e = error as { message?: string };
    if (
      e.message &&
      (e.message.includes("model output must contain") ||
        e.message.includes("output text or tool calls") ||
        e.message.includes("both be empty"))
    )
      return true;
  }
  return false;
}
