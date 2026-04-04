import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/openai";
import { verifyProjectAccess, auth } from "@/lib/auth";

export const maxDuration = 60;

/**
 * POST /api/projects/:id/gaps — Run gap analysis
 *
 * 1. Fetch cluster data + research question
 * 2. Build structured prompt for Gemini
 * 3. Parse response into gaps with priorities and search terms
 * 4. Store in DB, replacing any existing gaps
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Gap analysis requires authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: "Sign in to access gap analysis" } }, { status: 401 });
    }

    const pAccess = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!pAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await verifyProjectAccess(pAccess.userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // Get project context and clusters data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        researchQuestion: true,
        librarySummary: true,
        clusters: {
          select: {
            label: true,
            summary: true,
            clusterIndex: true,
            _count: { select: { chunkClusters: true } },
          },
          orderBy: { clusterIndex: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 }
      );
    }

    if (project.clusters.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_CLUSTERS",
            message:
              "Run orientation analysis first to detect gaps.",
          },
        },
        { status: 422 }
      );
    }

    // Build the cluster summary for the prompt
    const clusterSummary = project.clusters
      .map(
        (c, i) =>
          `Cluster ${i + 1}: "${c.label || `Cluster ${i + 1}`}" (${c._count.chunkClusters} chunks)\n  Summary: ${c.summary || "No summary"}`
      )
      .join("\n\n");

    const gapPrompt = `You are a research methodology expert analyzing a scholar's literature library for gaps.

## Research Question
"${project.researchQuestion}"

## What the Library Currently Covers
${clusterSummary}

${project.librarySummary ? `## Library Summary\n${project.librarySummary}\n` : ""}

## Task
Identify 3-6 research themes or perspectives that are MISSING or UNDERREPRESENTED in this library, given the research question. These should be topics the researcher would need to address for a comprehensive literature review.

For each gap, provide EXACTLY this format (one gap per block):

GAP_START
TITLE: [short descriptive title, max 60 chars]
PRIORITY: [HIGH or MEDIUM]
DESCRIPTION: [2-3 sentences explaining why this is a gap and why it matters for the research question]
SEARCH_TERMS: [term1 | term2 | term3 | term4]
GAP_END

Rules:
- HIGH priority = critical to answering the research question, a reviewer would flag this
- MEDIUM priority = would strengthen the review but not essential
- Search terms should be specific academic search queries the researcher can use in Google Scholar
- Do NOT list topics already well-covered by existing clusters
- Be specific and actionable, not vague`;

    let gapResponse: string;
    try {
      gapResponse = await generateText(gapPrompt);
    } catch (error) {
      console.error("Gap analysis generation error:", error);
      return NextResponse.json(
        {
          error: {
            code: "GENERATION_ERROR",
            message: "Failed to generate gap analysis.",
          },
        },
        { status: 500 }
      );
    }

    // Parse the structured response
    const gaps = parseGapResponse(gapResponse);

    if (gaps.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "PARSE_ERROR",
            message:
              "Could not parse gap analysis results. Try running again.",
          },
        },
        { status: 500 }
      );
    }

    // Clear existing gaps for this project
    await prisma.gap.deleteMany({ where: { projectId } });

    // Store new gaps
    const storedGaps = [];
    for (const gap of gaps) {
      const stored = await prisma.gap.create({
        data: {
          projectId,
          topic: gap.title,
          explanation: gap.description,
          suggestedTerms: JSON.stringify(gap.searchTerms),
          dismissed: false,
        },
      });
      storedGaps.push({
        id: stored.id,
        title: stored.topic,
        priority: gap.priority,
        description: stored.explanation,
        searchTerms: gap.searchTerms,
        addressed: stored.dismissed,
      });
    }

    return NextResponse.json({ gaps: storedGaps });
  } catch (error) {
    console.error("Gap analysis error:", error);
    return NextResponse.json(
      {
        error: {
          code: "GAP_ERROR",
          message: "Failed to run gap analysis.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/:id/gaps — Fetch stored gaps
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Gap data requires authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: "Sign in to access gap analysis" } }, { status: 401 });
    }

    const pAccess = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!pAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await verifyProjectAccess(pAccess.userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const gaps = await prisma.gap.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    // Also fetch cluster data for coverage chart
    const clusters = await prisma.cluster.findMany({
      where: { projectId },
      select: {
        label: true,
        clusterIndex: true,
        _count: { select: { chunkClusters: true } },
      },
      orderBy: { clusterIndex: "asc" },
    });

    // Compute coverage scores from chunk counts (relative to largest cluster)
    const maxChunks = Math.max(
      ...clusters.map((c) => c._count.chunkClusters),
      1
    );
    const coverage = clusters.map((c) => ({
      label: c.label || `Cluster ${c.clusterIndex + 1}`,
      covered: Math.round((c._count.chunkClusters / maxChunks) * 100),
    }));

    return NextResponse.json({
      gaps: gaps.map((g) => {
        let searchTerms: string[] = [];
        try {
          searchTerms = g.suggestedTerms
            ? JSON.parse(g.suggestedTerms)
            : [];
        } catch {
          searchTerms = g.suggestedTerms
            ? g.suggestedTerms.split(",").map((t) => t.trim())
            : [];
        }

        return {
          id: g.id,
          title: g.topic,
          // Infer priority from position: first half = high, rest = medium
          priority:
            gaps.indexOf(g) < Math.ceil(gaps.length / 2)
              ? "high"
              : "medium",
          description: g.explanation,
          searchTerms,
          addressed: g.dismissed,
        };
      }),
      coverage,
    });
  } catch (error) {
    console.error("Failed to fetch gaps:", error);
    return NextResponse.json(
      {
        error: {
          code: "FETCH_ERROR",
          message: "Failed to fetch gaps.",
        },
      },
      { status: 500 }
    );
  }
}

// ─── Parser ───

interface ParsedGap {
  title: string;
  priority: "high" | "medium";
  description: string;
  searchTerms: string[];
}

function parseGapResponse(response: string): ParsedGap[] {
  const gaps: ParsedGap[] = [];

  // Split by GAP_START/GAP_END markers
  const blocks = response.split(/GAP_START/i);

  for (const block of blocks) {
    const content = block.split(/GAP_END/i)[0];
    if (!content || content.trim().length < 20) continue;

    const titleMatch = content.match(/TITLE:\s*(.+)/i);
    const priorityMatch = content.match(/PRIORITY:\s*(HIGH|MEDIUM)/i);
    const descMatch = content.match(
      /DESCRIPTION:\s*([\s\S]*?)(?=SEARCH_TERMS:|$)/i
    );
    const termsMatch = content.match(/SEARCH_TERMS:\s*(.+)/i);

    if (titleMatch && descMatch) {
      const searchTerms = termsMatch
        ? termsMatch[1]
            .split("|")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      gaps.push({
        title: titleMatch[1].trim(),
        priority:
          priorityMatch && priorityMatch[1].toUpperCase() === "HIGH"
            ? "high"
            : "medium",
        description: descMatch[1].trim(),
        searchTerms,
      });
    }
  }

  return gaps;
}
