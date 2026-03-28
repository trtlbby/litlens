import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedText, generateText } from "@/lib/openai";

export const maxDuration = 60;

/**
 * POST /api/projects/:id/ask — RAG pipeline
 *
 * 1. Embed the user's question
 * 2. Vector similarity search against chunk embeddings (pgvector cosine distance)
 * 3. Feed top-k chunks + question to Gemini for answer synthesis
 * 4. Store Q&A session + sources in DB
 * 5. Return answer with citations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return NextResponse.json(
        { error: { code: "INVALID_QUESTION", message: "Question must be at least 3 characters." } },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, researchQuestion: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 }
      );
    }

    // ─── Step 1: Embed the question ───
    let questionEmbedding: number[];
    try {
      questionEmbedding = await embedText(question.trim());
    } catch (error) {
      console.error("Question embedding error:", error);
      return NextResponse.json(
        { error: { code: "EMBEDDING_ERROR", message: "Failed to embed question." } },
        { status: 500 }
      );
    }

    // ─── Step 2: Vector similarity search (cosine distance) ───
    const embeddingStr = `[${questionEmbedding.join(",")}]`;

    const topChunks: {
      id: string;
      text: string;
      chunk_index: number;
      document_id: string;
      filename: string;
      title: string | null;
      distance: number;
    }[] = await prisma.$queryRawUnsafe(
      `SELECT 
         c.id, c.text, c.chunk_index, c.document_id,
         d.filename, d.title,
         (c.embedding <=> $1::vector) as distance
       FROM chunks c
       JOIN documents d ON c.document_id = d.id
       WHERE c.project_id = $2::uuid
         AND c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $1::vector
       LIMIT 8`,
      embeddingStr,
      projectId
    );

    if (topChunks.length === 0) {
      return NextResponse.json(
        { error: { code: "NO_CHUNKS", message: "No document chunks found. Upload and process documents first." } },
        { status: 422 }
      );
    }

    // ─── Step 3: Build context and generate answer via Gemini ───
    const contextPassages = topChunks
      .map(
        (c, i) =>
          `[Source ${i + 1} — ${c.title || c.filename}]\n${c.text}`
      )
      .join("\n\n---\n\n");

    const ragPrompt = `You are a research assistant helping a scholar analyze their literature library. Answer the following question based ONLY on the provided source passages. If the passages don't contain enough information, say so honestly.

${project.researchQuestion ? `The researcher's overarching question is: "${project.researchQuestion}"\n` : ""}
## Question
${question.trim()}

## Source Passages
${contextPassages}

## Instructions
1. Synthesize a clear, comprehensive answer using information from the sources.
2. Reference specific sources by their number (e.g., "According to Source 1...").
3. If sources disagree, note the different perspectives.
4. If the sources don't adequately address the question, state what's missing.
5. Write in a scholarly but accessible tone, 3-5 paragraphs.
6. Do NOT use markdown formatting (no **, no ##, no bullets). Write in plain prose paragraphs.`;

    let answer: string;
    try {
      answer = await generateText(ragPrompt);
    } catch (error) {
      console.error("Answer generation error:", error);
      return NextResponse.json(
        { error: { code: "GENERATION_ERROR", message: "Failed to generate answer." } },
        { status: 500 }
      );
    }

    // ─── Step 4: Store Q&A session in DB ───
    const qaSession = await prisma.qaSession.create({
      data: {
        projectId,
        question: question.trim(),
        answer,
      },
    });

    // Store source references
    const sources = [];
    for (const chunk of topChunks) {
      // Relevance score: 1 - cosine_distance (higher = more relevant)
      const relevanceScore = Math.max(0, 1 - chunk.distance);

      const source = await prisma.qaSource.create({
        data: {
          qaSessionId: qaSession.id,
          chunkId: chunk.id,
          documentId: chunk.document_id,
          passage: chunk.text,
          relevanceScore,
        },
      });

      sources.push({
        id: source.id,
        passage: chunk.text,
        document_filename: chunk.filename,
        document_title: chunk.title,
        relevance_score: relevanceScore,
        relevance: relevanceScore > 0.5 ? "High" : relevanceScore > 0.3 ? "Medium" : "Low",
      });
    }

    // ─── Step 5: Return answer with citations ───
    return NextResponse.json({
      id: qaSession.id,
      question: qaSession.question,
      answer: qaSession.answer,
      created_at: qaSession.createdAt,
      sources: sources.sort((a, b) => b.relevance_score - a.relevance_score),
    });
  } catch (error) {
    console.error("Q&A pipeline error:", error);
    return NextResponse.json(
      { error: { code: "QA_ERROR", message: "Failed to process question." } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/:id/ask — Fetch past Q&A sessions
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const sessions = await prisma.qaSession.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      include: {
        sources: {
          include: {
            document: {
              select: { filename: true, title: true },
            },
          },
          orderBy: { relevanceScore: "desc" },
        },
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        question: s.question,
        answer: s.answer,
        created_at: s.createdAt,
        sources: s.sources.map((src) => ({
          id: src.id,
          passage: src.passage,
          document_filename: src.document.filename,
          document_title: src.document.title,
          relevance_score: src.relevanceScore,
          relevance: src.relevanceScore > 0.5 ? "High" : src.relevanceScore > 0.3 ? "Medium" : "Low",
        })),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch Q&A sessions:", error);
    return NextResponse.json(
      { error: { code: "FETCH_ERROR", message: "Failed to fetch Q&A history." } },
      { status: 500 }
    );
  }
}
