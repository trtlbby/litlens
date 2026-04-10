import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  embedText,
  generateText,
  cosineSimilarity,
} from "@/lib/openai";
import { verifyProjectAccess } from "@/lib/auth";

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

    const pAccess = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!pAccess) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    if (!(await verifyProjectAccess(pAccess.userId))) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 403 });

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
      relevance: number;
      relevanceReason: string;
    }[] = [];

    const batchPrompts: string[] = [];

    // First, collect the sample texts for each cluster
    for (const [clusterIdx, chunks] of clusterGroups) {
      // Sort by distance (closest to centroid first)
      chunks.sort((a, b) => a.distance - b.distance);
      const topChunks = chunks.slice(0, 5);

      // Unique documents in this cluster
      const uniqueDocIds = [...new Set(chunks.map((c) => c.docId))];
      const docNames = uniqueDocIds.map(
        (id) => docMap.get(id)?.title || docMap.get(id)?.filename || "Unknown"
      );

      // Save base data (labels will be filled after the batch request)
      clusterData.push({
        clusterIndex: clusterIdx,
        label: `Cluster ${clusterIdx + 1}`,
        summary: "Generating summary...",
        centroid: clusterResult.centroids[clusterIdx],
        chunks: chunks.map((c) => ({ chunkId: c.chunkId, distance: c.distance })),
        docCount: uniqueDocIds.length,
        docNames,
        relevance: 0,
        relevanceReason: "",
      });

      const sampleTexts = topChunks
        .map((c, i) => `[Document Snippet ${i + 1}]: ${c.text}`)
        .join("\n");
      batchPrompts.push(`--- CLUSTER ${clusterIdx} ---\n${sampleTexts}`);
    }

    // Batched MEGA-PROMPT for all clusters, summary, and gaps to save API quota!
    let librarySummary = "Summary generation failed or is pending.";
    let notableGapsArr: string[] = [];

    if (batchPrompts.length > 0) {
      const hasRQ = !!project.researchQuestion;
      const megaPrompt = `You are an expert research assistant. I have grouped academic text snippets into ${batchPrompts.length} thematic clusters.
${hasRQ ? `\nThe user's specific Research Question is: "${project.researchQuestion}"\n` : ""}
Please perform ${hasRQ ? "FOUR" : "THREE"} tasks based on the provided clusters:

1. CLUSTER LABELING: For EACH cluster, provide a short label (3-6 words) and a one-sentence summary.
2. LIBRARY SUMMARY: Write a 2-3 sentence plain-English summary of what this entire library covers. Write in second person ("Your library...").
3. GAP DETECTION: ${hasRQ ? `Identify 2-3 missing or underrepresented topics relevant to the research question.` : `Identify 2-3 important missing topics.`} Provide ONLY short 1-to-3 word tags (e.g., "Cost-effectiveness", "Workforce Training"). Do not write full sentences.
${hasRQ ? `4. CLUSTER RELEVANCE: For EACH cluster, rate its relevance to the research question on a scale of 0 to 10 (0 = completely irrelevant, 10 = directly answers the question). Then provide ONE sentence explaining HOW the cluster relates to the research question, or why it does NOT relate. Be strict: if the documents in the cluster have nothing to do with the research question, give a score of 0-2 and clearly state they are irrelevant.` : ""}

Respond EXACTLY in this format:

=== CLUSTERS ===
CLUSTER 0
LABEL: [Label 0]
SUMMARY: [Summary 0]
${hasRQ ? "RELEVANCE: [0-10]\nRELEVANCE_REASON: [One sentence explaining how it relates or doesn't relate to the research question]" : ""}

CLUSTER 1
LABEL: [Label 1]
SUMMARY: [Summary 1]
${hasRQ ? "RELEVANCE: [0-10]\nRELEVANCE_REASON: [One sentence explaining how it relates or doesn't relate to the research question]" : ""}

=== LIBRARY SUMMARY ===
[Your 2-3 sentence library summary...]

=== NOTABLE GAPS ===
• [Tag 1]
• [Tag 2]
• [Tag 3]

Here are the clusters:

${batchPrompts.join("\n\n")}`;

      try {
        const llmResponse = await generateText(megaPrompt);
        
        // 1. Parse Clusters
        for (const cd of clusterData) {
          const clusterRegex = new RegExp(
            `CLUSTER ${cd.clusterIndex}\\s*\\nLABEL:\\s*(.+?)\\s*\\nSUMMARY:\\s*(.+?)` +
            (hasRQ ? `\\s*\\nRELEVANCE:\\s*(\\d+)\\s*\\nRELEVANCE_REASON:\\s*(.+)` : ``),
            "i"
          );
          const match = llmResponse.match(clusterRegex);
          if (match) {
            cd.label = match[1].trim();
            cd.summary = match[2].trim();
            if (hasRQ && match[3]) {
              cd.relevance = Math.min(10, Math.max(0, parseInt(match[3], 10) || 0));
              cd.relevanceReason = match[4]?.trim() || "";
            }
          }
        }

        // 2. Parse Library Summary
        const summaryMatch = llmResponse.match(/===\s*LIBRARY SUMMARY\s*===\s*\n([\s\S]*?)(?=\n===\s*NOTABLE GAPS|$)/i);
        if (summaryMatch && summaryMatch[1].trim()) {
          librarySummary = summaryMatch[1].trim();
        }

        // 3. Parse Notable Gaps
        const gapsMatch = llmResponse.match(/===\s*NOTABLE GAPS\s*===\s*\n([\s\S]*?)$/i);
        if (gapsMatch && gapsMatch[1].trim()) {
           notableGapsArr = gapsMatch[1]
             .split("\n")
             .map((l) => l.replace(/^[•\-\d\.]\s*/, "").trim()) // remove bullets
             .filter((l) => l.length > 0)
             .slice(0, 3);
        }

      } catch (error) {
        console.error("Batched labeling/summary failed:", error);
      }
    }

    // ─── Step 4: Store clusters in DB ───
    for (const cd of clusterData) {
      const centroidStr = `[${cd.centroid.join(",")}]`;

      // Create cluster with raw SQL for vector column
      const clusterRows: { id: string }[] = await prisma.$queryRawUnsafe(
        `INSERT INTO clusters (id, project_id, label, summary, centroid, cluster_index, relevance, relevance_reason, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4::vector, $5, $6, $7, NOW())
         RETURNING id`,
        projectId,
        cd.label,
        cd.summary,
        centroidStr,
        cd.clusterIndex,
        cd.relevance || null,
        cd.relevanceReason || null
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

    // ─── Step 5: Alignment scoring (calibrated hybrid) ───
    let alignmentScore = 0;
    let strongCoverage: string[] = [];

    // Cosine similarity baseline for unrelated academic texts in high-dim space.
    // Anything at or below this = 0% alignment.
    const COSINE_BASELINE = 0.45;
    // Power curve exponent — compresses the neutral zone so only
    // genuinely related content scores above 50.
    const POWER_CURVE = 1.5;

    if (project.researchQuestion) {
      try {
        // Embed the research question
        const questionEmbedding = await embedText(project.researchQuestion);

        // Compute calibrated cosine similarity against each cluster centroid
        const similarities = clusterData.map((cd) => {
          const rawSim = cosineSimilarity(questionEmbedding, cd.centroid);
          // Calibrate: subtract baseline, clamp [0,1], apply power curve
          const calibrated = Math.max(0, (rawSim - COSINE_BASELINE) / (1 - COSINE_BASELINE));
          const curved = Math.pow(calibrated, POWER_CURVE);
          return {
            label: cd.label,
            embeddingScore: curved,
            llmRelevance: cd.relevance, // 0-10 from LLM
            docCount: cd.docCount,
          };
        });

        // Compute embedding-based score (weighted average by doc count)
        const totalDocs = similarities.reduce((sum, s) => sum + s.docCount, 0);
        const embeddingScore =
          similarities.reduce((sum, s) => sum + s.embeddingScore * s.docCount, 0) / Math.max(totalDocs, 1);

        // Compute LLM-based score (weighted average of 0-10 relevance, scaled to 0-1)
        const llmScore =
          similarities.reduce((sum, s) => sum + (s.llmRelevance / 10) * s.docCount, 0) / Math.max(totalDocs, 1);

        // Hybrid: 60% LLM-judged, 40% embedding-based
        const hybridScore = 0.6 * llmScore + 0.4 * embeddingScore;

        // Scale 0-1 → 0-100
        alignmentScore = Math.round(hybridScore * 100);
        if (isNaN(alignmentScore)) alignmentScore = 0;
        alignmentScore = Math.min(100, Math.max(0, alignmentScore));

        // Strong coverage: clusters with LLM relevance >= 7
        strongCoverage = similarities
          .filter((s) => s.llmRelevance >= 7)
          .sort((a, b) => b.llmRelevance - a.llmRelevance)
          .map((s) => s.label);

        // Detected gaps are now handled in the mega-prompt!
      } catch (error) {
        console.error("Alignment scoring error:", error);
        alignmentScore = 0; // don't guess an optimistic score
      }
    }

    // ─── Step 6: Library summary via Gemini ───
    // Library summary is now handled in the mega-prompt above!

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
        relevance: cd.relevance,
        relevance_reason: cd.relevanceReason,
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

    const pAccess = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!pAccess) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
    if (!(await verifyProjectAccess(pAccess.userId))) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 403 });

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
        relevance: c.relevance,
        relevance_reason: c.relevanceReason,
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
