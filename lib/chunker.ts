/**
 * Chunking strategy per Section 7.1 of the spec:
 * - Group sentences into chunks of 5 with 1-sentence overlap
 * - Skip chunks shorter than 20 words
 */

export interface TextChunk {
    text: string;
    chunkIndex: number;
}

const SENTENCES_PER_CHUNK = 5;
const OVERLAP_SENTENCES = 1;
const MIN_WORDS = 20;

/**
 * Create overlapping chunks from an array of sentences.
 * 
 * @param sentences - Array of sentences from the PDF extraction
 * @returns Array of TextChunk objects with text and positional index
 */
export function createChunks(sentences: string[]): TextChunk[] {
    if (sentences.length === 0) return [];

    const chunks: TextChunk[] = [];
    let chunkIndex = 0;
    const step = SENTENCES_PER_CHUNK - OVERLAP_SENTENCES; // 4

    for (let i = 0; i < sentences.length; i += step) {
        const chunkSentences = sentences.slice(i, i + SENTENCES_PER_CHUNK);
        const text = chunkSentences.join(" ").trim();

        // Skip chunks shorter than MIN_WORDS
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        if (wordCount < MIN_WORDS) continue;

        chunks.push({
            text,
            chunkIndex,
        });
        chunkIndex++;

        // If we've consumed all sentences, stop
        if (i + SENTENCES_PER_CHUNK >= sentences.length) break;
    }

    return chunks;
}
