import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * POST /api/projects — Create a new project
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));

        const project = await prisma.project.create({
            data: {
                userId: session.user.id,
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

/**
 * GET /api/projects — Fetch all projects for the logged in user
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
        }

        const projects = await prisma.project.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: "desc" },
            include: {
                _count: {
                    select: { documents: true }
                }
            }
        });

        // Format for the AuthContext Project mapping
        return NextResponse.json(projects.map(p => ({
            id: p.id,
            name: p.title,
            question: p.researchQuestion,
            fileCount: p._count.documents,
            createdAt: p.createdAt.toISOString().split("T")[0],
            lastAccessed: p.updatedAt.toISOString().split("T")[0],
        })));
    } catch (error) {
        console.error("Failed to fetch projects:", error);
        return NextResponse.json({ error: { message: "Failed to fetch projects" } }, { status: 500 });
    }
}
