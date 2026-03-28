import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/projects — Create a new project
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));

        const project = await prisma.project.create({
            data: {
                title: body.title || "Untitled Project",
                researchQuestion: body.research_question || null,
                scopeContext: body.scope_context || null,
                methodology: body.methodology || null,
                knownCoverage: body.known_coverage || null,
            },
        });

        return NextResponse.json(
            {
                id: project.id,
                title: project.title,
                research_question: project.researchQuestion,
                created_at: project.createdAt,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Failed to create project:", error);
        return NextResponse.json(
            { error: { code: "CREATE_ERROR", message: "Failed to create project" } },
            { status: 500 }
        );
    }
}
