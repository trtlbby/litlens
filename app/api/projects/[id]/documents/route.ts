import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedTexts } from "@/lib/openai";
import { createChunks } from "@/lib/chunker";

// Allow function to run up to 60 seconds (Vercel Hobby max)
export const maxDuration = 60;

const PYTHON_SERVICE_URL =
    process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

/**
 * POST /api/projects/:id/documents — Upload PDF, extract, chunk, embed, store
 * 
 * Pipeline:
 * 1. Accept PDF via multipart form upload
 * 2. Send PDF to Python microservice for extraction
 * 3. Chunk extracted sentences per Section 7.1
 * 4. Embed each chunk via Gemini text-embedding-004
 * 5. Store document + chunks (with embeddings) in PostgreSQL via Prisma raw SQL
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "Project not found" } },
                { status: 404 }
            );
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: { code: "NO_FILE", message: "No PDF file provided" } },
                { status: 400 }
            );
        }

        if (
            !file.name.toLowerCase().endsWith(".pdf") &&
            file.type !== "application/pdf"
        ) {
            return NextResponse.json(
                {
                    error: {
                        code: "INVALID_FILE_TYPE",
                        message: "Only PDF files are accepted. Mobile devices may need to ensure the file has a .pdf extension.",
                    },
                },
                { status: 400 }
            );
        }

        // --- Step 1: Send to Python microservice for extraction ---
        const extractFormData = new FormData();
        extractFormData.append("file", file);

        let extractionResult: {
            full_text: string;
            sentences: string[];
            title: string;
            authors: string;
            year: number | null;
        };

        try {
            const extractResponse = await fetch(
                `${PYTHON_SERVICE_URL}/extract`,
                {
                    method: "POST",
                    body: extractFormData,
                }
            );

            if (!extractResponse.ok) {
                const errorBody = await extractResponse.json().catch(() => null);
                const message =
                    errorBody?.detail?.message ||
                    errorBody?.detail ||
                    "PDF extraction failed";
                return NextResponse.json(
                    { error: { code: "EXTRACTION_ERROR", message } },
                    { status: 422 }
                );
            }

            extractionResult = await extractResponse.json();
        } catch (error) {
            console.error("Python service connection error:", error);
            return NextResponse.json(
                {
                    error: {
                        code: "SERVICE_UNAVAILABLE",
                        message:
                            "PDF extraction service is unavailable. Please ensure the Python service is running.",
                    },
                },
                { status: 503 }
            );
        }

        // --- Step 2: Chunk the extracted sentences ---
        const chunks = createChunks(extractionResult.sentences);

        if (chunks.length === 0) {
            return NextResponse.json(
                {
                    error: {
                        code: "NO_CHUNKS",
                        message:
                            "The PDF did not contain enough text to create meaningful chunks.",
                    },
                },
                { status: 422 }
            );
        }

        // --- Step 3: Store document in database FIRST (before embedding) ---
        // This ensures the document exists even if embedding fails later
        const document = await prisma.document.create({
            data: {
                projectId,
                filename: file.name,
                title: extractionResult.title || file.name.replace(".pdf", ""),
                authors: extractionResult.authors || null,
                year: extractionResult.year || null,
                fullText: extractionResult.full_text,
            },
        });

        // --- Step 4: Embed all chunks via Gemini ---
        let embeddings: number[][];
        try {
            embeddings = await embedTexts(chunks.map((c) => c.text));
        } catch (error) {
            console.error("Embedding error:", error);
            // Document is saved but has no chunks — user can see it and retry
            return NextResponse.json(
                {
                    id: document.id,
                    project_id: projectId,
                    filename: document.filename,
                    title: document.title,
                    authors: document.authors,
                    year: document.year,
                    chunk_count: 0,
                    created_at: document.createdAt,
                    warning: "Document saved but embedding failed. Chunks were not generated.",
                    error: {
                        code: "EMBEDDING_ERROR",
                        message: `Embedding failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                    },
                },
                { status: 207 } // 207 Multi-Status: partial success
            );
        }

        // --- Step 5: Store chunks with embeddings ---
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = embeddings[i];
            const embeddingStr = `[${embedding.join(",")}]`;

            await prisma.$executeRawUnsafe(
                `INSERT INTO chunks (id, document_id, project_id, text, chunk_index, embedding, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5::vector, NOW())`,
                document.id,
                projectId,
                chunk.text,
                chunk.chunkIndex,
                embeddingStr
            );
        }

        return NextResponse.json(
            {
                id: document.id,
                project_id: projectId,
                filename: document.filename,
                title: document.title,
                authors: document.authors,
                year: document.year,
                chunk_count: chunks.length,
                created_at: document.createdAt,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Document upload error:", error);
        return NextResponse.json(
            {
                error: {
                    code: "UPLOAD_ERROR",
                    message: "Failed to process document upload",
                },
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/projects/:id/documents — List all documents for a project
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;

        const documents = await prisma.document.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                filename: true,
                title: true,
                authors: true,
                year: true,
                createdAt: true,
                _count: {
                    select: { chunks: true },
                },
            },
        });

        return NextResponse.json({
            documents: documents.map((doc) => ({
                id: doc.id,
                filename: doc.filename,
                title: doc.title,
                authors: doc.authors,
                year: doc.year,
                chunk_count: doc._count.chunks,
                created_at: doc.createdAt,
            })),
        });
    } catch (error) {
        console.error("Failed to list documents:", error);
        return NextResponse.json(
            {
                error: {
                    code: "FETCH_ERROR",
                    message: "Failed to fetch documents",
                },
            },
            { status: 500 }
        );
    }
}
