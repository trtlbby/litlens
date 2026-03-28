import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/projects/:id — Get project details with documents and clusters
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                documents: {
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        filename: true,
                        title: true,
                        authors: true,
                        year: true,
                        createdAt: true,
                    },
                },
                clusters: {
                    orderBy: { clusterIndex: "asc" },
                },
                _count: {
                    select: { chunks: true },
                },
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "Project not found" } },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: project.id,
            title: project.title,
            research_question: project.researchQuestion,
            scope_context: project.scopeContext,
            methodology: project.methodology,
            known_coverage: project.knownCoverage,
            created_at: project.createdAt,
            documents: project.documents,
            clusters: project.clusters,
            chunk_count: project._count.chunks,
        });
    } catch (error) {
        console.error("Failed to fetch project:", error);
        return NextResponse.json(
            { error: { code: "FETCH_ERROR", message: "Failed to fetch project" } },
            { status: 500 }
        );
    }
}
