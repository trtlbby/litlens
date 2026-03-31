import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  embedText,
  generateText,
  cosineSimilarity,
} from "@/lib/openai";

export const maxDuration = 300;

const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

/**
 * POST /api/projects/:id/orient — Run the full orientation pipeline
 *
 * Pipeline:
 * 1. Fetch all chunk embeddings from DB
 * 2. Send embeddings to Python /cluster (k-means)
 * 3. For each cluster: pick top chunks → Gemini labels + summarizes
 * 4. Embed research question → compute alignment score
 * 5. Generate library summary via Gemini
 * 6. Store clusters + orientation data in DB
 */
export async function POST(
  _request: NextRequest,
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

    // ─── Step 1: Fetch all chunk embeddings from DB ───
    const chunksRaw: { id: string; text: string; document_id: string; embedding: string }[] =
      await prisma.$queryRawUnsafe(
        `SELECT id, text, document_id, embedding::text FROM chunks WHERE project_id = $1::uuid ORDER BY chunk_index`,
        projectId
      );

    if (chunksRaw.length < 2) {
      return NextResponse.json(
        {
          error: {
            code: "INSUFFICIENT_DATA",
            message: "Need at least 2 chunks to cluster. Upload more documents.",
          },
        },
        { status: 422 }
      );
    }

    // Parse embedding strings "[0.1,0.2,...]" into float arrays
    const embeddings: number[][] = chunksRaw.map((c) => {
      const str = c.embedding.replace("[", "").replace("]", "");
      return str.split(",").map(Number);
    });

    // ─── Step 2: Send to Python /cluster ───
    let clusterResult: {
      k: number;
      assignments: number[];
      centroids: number[][];
      distances: number[];
    };

    try {
      const clusterRes = await fetch(`${PYTHON_SERVICE_URL}/cluster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeddings }),
      });

      if (!clusterRes.ok) {
        throw new Error("Clustering service returned an error");
      }

      clusterResult = await clusterRes.json();
    } catch (error) {
      console.error("Clustering error:", error);
      return NextResponse.json(
        {
          error: {
            code: "CLUSTERING_ERROR",
            message: "Failed to cluster embeddings. Ensure the Python service is running.",
          },
        },
        { status: 503 }
      );
    }

    // ─── Step 3: Delete old clusters, label new ones via Gemini ───
    await prisma.cluster.deleteMany({ where: { projectId } });

    // Group chunks by cluster assignment
    const clusterGroups: Map<number, { chunkId: string; text: string; docId: string; distance: number }[]> = new Map();
    for (let i = 0; i < chunksRaw.length; i++) {
      const clusterIdx = clusterResult.assignments[i];
      if (!clusterGroups.has(clusterIdx)) {
        clusterGroups.set(clusterIdx, []);
      }
      clusterGroups.get(clusterIdx)!.push({
        chunkId: chunksRaw[i].id,
        text: chunksRaw[i].text,
        docId: chunksRaw[i].document_id,
        distance: clusterResult.distances[i],
      });
    }

    // Get document filename lookup
    const documents = await prisma.document.findMany({
      where: { projectId },
      select: { id: true, filename: true, title: true },
    });
    const docMap = new Map(documents.map((d) => [d.id, d]));

    // For each cluster: pick top 5 closest chunks, send to Gemini for label + summary
    const clusterData: {
      clusterIndex: number;
      label: string;
      summary: string;
      centroid: number[];
      chunks: { chunkId: string; distance: number }[];
      docCount: number;
      docNames: string[];
    }[] = [];

    for (const [clusterIdx, chunks] of clusterGroups) {
      // Sort by distance (closest to centroid first)
      chunks.sort((a, b) => a.distance - b.distance);
      const topChunks = chunks.slice(0, 5);

      // Unique documents in this cluster
      const uniqueDocIds = [...new Set(chunks.map((c) => c.docId))];
      const docNames = uniqueDocIds.map(
        (id) => docMap.get(id)?.title || docMap.get(id)?.filename || "Unknown"
      );

      // Build prompt for Gemini to label + summarize the cluster
      const sampleTexts = topChunks
        .map((c, i) => `[${i + 1}] ${c.text}`)
        .join("\n\n");

      const labelPrompt = `You are analyzing a cluster of academic text passages from a literature review. These passages were grouped together by semantic similarity.

Here are the 5 most representative passages from this cluster:

${sampleTexts}

Based on these passages, provide:
1. A short, descriptive label for this thematic cluster (3-6 words, like "Technology Adoption Barriers" or "AI in Clinical Diagnostics")
2. A one-sentence summary of what this cluster covers

Respond in this exact format (no markdown):
LABEL: [your label here]
SUMMARY: [your summary here]`;

      try {
        const llmResponse = await generateText(labelPrompt);

        const labelMatch = llmResponse.match(/LABEL:\s*(.+)/i);
        const summaryMatch = llmResponse.match(/SUMMARY:\s*(.+)/i);

        const label = labelMatch?.[1]?.trim() || `Cluster ${clusterIdx + 1}`;
        const summary = summaryMatch?.[1]?.trim() || "No summary available.";

        clusterData.push({
          clusterIndex: clusterIdx,
          label,
          summary,
          centroid: clusterResult.centroids[clusterIdx],
          chunks: chunks.map((c) => ({ chunkId: c.chunkId, distance: c.distance })),
          docCount: uniqueDocIds.length,
          docNames,
        });
      } catch (error) {
        console.error(`Failed to label cluster ${clusterIdx}:`, error);
        clusterData.push({
          clusterIndex: clusterIdx,
          label: `Cluster ${clusterIdx + 1}`,
          summary: "Could not generate summary.",
          centroid: clusterResult.centroids[clusterIdx],
          chunks: chunks.map((c) => ({ chunkId: c.chunkId, distance: c.distance })),
          docCount: uniqueDocIds.length,
          docNames,
        });
      }
    }

    // ─── Step 4: Store clusters in DB ───
    for (const cd of clusterData) {
      const centroidStr = `[${cd.centroid.join(",")}]`;

      // Create cluster with raw SQL for vector column
      const clusterRows: { id: string }[] = await prisma.$queryRawUnsafe(
        `INSERT INTO clusters (id, project_id, label, summary, centroid, cluster_index, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4::vector, $5, NOW())
         RETURNING id`,
        projectId,
        cd.label,
        cd.summary,
        centroidStr,
        cd.clusterIndex
      );

      const clusterId = clusterRows[0].id;

      // Insert chunk-cluster mappings
      for (const chunk of cd.chunks) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO chunk_clusters (chunk_id, cluster_id, distance)
           VALUES ($1::uuid, $2::uuid, $3)
           ON CONFLICT DO NOTHING`,
          chunk.chunkId,
          clusterId,
          chunk.distance
        );
      }
    }

    // ─── Step 5: Alignment scoring ───
    let alignmentScore = 0;
    let strongCoverage: string[] = [];
    let notableGapsArr: string[] = [];

    if (project.researchQuestion) {
      try {
        // Embed the research question
        const questionEmbedding = await embedText(project.researchQuestion);

        // Compute cosine similarity against each cluster centroid
        const similarities = clusterData.map((cd) => ({
          label: cd.label,
          similarity: cosineSimilarity(questionEmbedding, cd.centroid),
          docCount: cd.docCount,
        }));

        // Overall alignment = weighted average (by doc count)
        const totalDocs = similarities.reduce((sum, s) => sum + s.docCount, 0);
        const weightedScore =
          similarities.reduce((sum, s) => sum + s.similarity * s.docCount, 0) / Math.max(totalDocs, 1);

        // Scale 0-1 → 0-100
        alignmentScore = Math.round(weightedScore * 100);
        if (isNaN(alignmentScore)) alignmentScore = 0;

        // Strong coverage: clusters with similarity > 0.6
        strongCoverage = similarities
          .filter((s) => s.similarity > 0.6)
          .sort((a, b) => b.similarity - a.similarity)
          .map((s) => s.label);

        // Detect gaps via Gemini
        const clusterLabels = clusterData.map((c) => c.label).join(", ");
        const gapPrompt = `A researcher's question is: "${project.researchQuestion}"

Their library covers these thematic clusters: ${clusterLabels}

What 2-3 important topics relevant to this research question are NOT covered by these clusters? Respond with just the topic names, one per line, no numbering or bullets.`;

        const gapResponse = await generateText(gapPrompt);
        notableGapsArr = gapResponse
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .slice(0, 3);
      } catch (error) {
        console.error("Alignment scoring error:", error);
        alignmentScore = 50; // default
      }
    }

    // ─── Step 6: Library summary via Gemini ───
    let librarySummary = "";
    try {
      const clusterSummaries = clusterData
        .map((cd) => `• ${cd.label} (${cd.docCount} docs): ${cd.summary}`)
        .join("\n");

      const summaryPrompt = `You are summarizing a researcher's literature library. Here are the thematic clusters found:

${clusterSummaries}

Total documents: ${documents.length}
${project.researchQuestion ? `Research question: "${project.researchQuestion}"` : ""}

Write a 3-4 sentence plain-English summary of what this library covers, noting strengths and any apparent gaps. Write in second person ("Your library..."). Do not use markdown.`;

      librarySummary = await generateText(summaryPrompt);
    } catch (error) {
      console.error("Summary generation error:", error);
      librarySummary = "Unable to generate library summary at this time.";
    }

    // ─── Step 7: Update project with orientation data ───
    await prisma.project.update({
      where: { id: projectId },
      data: {
        librarySummary,
        alignmentScore,
        strongCoverage: JSON.stringify(strongCoverage),
        notableGaps: JSON.stringify(notableGapsArr),
      },
    });

    // ─── Return full orientation data ───
    return NextResponse.json({
      alignment_score: alignmentScore,
      library_summary: librarySummary,
      strong_coverage: strongCoverage,
      notable_gaps: notableGapsArr,
      clusters: clusterData.map((cd) => ({
        cluster_index: cd.clusterIndex,
        label: cd.label,
        summary: cd.summary,
        doc_count: cd.docCount,
        doc_names: cd.docNames,
      })),
    });
  } catch (error) {
    console.error("Orientation pipeline error:", error);
    return NextResponse.json(
      {
        error: {
          code: "ORIENTATION_ERROR",
          message: "Failed to run orientation pipeline",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/:id/orient — Fetch stored orientation data
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        researchQuestion: true,
        librarySummary: true,
        alignmentScore: true,
        strongCoverage: true,
        notableGaps: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 }
      );
    }

    // Fetch clusters with document info
    const clusters = await prisma.cluster.findMany({
      where: { projectId },
      orderBy: { clusterIndex: "asc" },
      include: {
        chunkClusters: {
          include: {
            chunk: {
              select: {
                document: {
                  select: { id: true, filename: true, title: true },
                },
              },
            },
          },
        },
      },
    });

    // Count documents
    const docCount = await prisma.document.count({ where: { projectId } });

    const clusterResponse = clusters.map((c) => {
      // Unique documents in this cluster
      const docIds = new Set<string>();
      const docNames: string[] = [];
      c.chunkClusters.forEach((cc) => {
        const doc = cc.chunk.document;
        if (!docIds.has(doc.id)) {
          docIds.add(doc.id);
          docNames.push(doc.title || doc.filename);
        }
      });

      return {
        id: c.id,
        cluster_index: c.clusterIndex,
        label: c.label,
        summary: c.summary,
        doc_count: docIds.size,
        doc_names: docNames,
      };
    });

    return NextResponse.json({
      research_question: project.researchQuestion,
      alignment_score: project.alignmentScore,
      library_summary: project.librarySummary,
      strong_coverage: project.strongCoverage ? JSON.parse(project.strongCoverage) : [],
      notable_gaps: project.notableGaps ? JSON.parse(project.notableGaps) : [],
      doc_count: docCount,
      clusters: clusterResponse,
    });
  } catch (error) {
    console.error("Failed to fetch orientation:", error);
    return NextResponse.json(
      { error: { code: "FETCH_ERROR", message: "Failed to fetch orientation data" } },
      { status: 500 }
    );
  }
}
