import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * POST /api/projects/claim — Assign anonymous projects to the logged-in user
 *
 * Body: { projectIds: string[] }
 * Only claims projects where userId IS NULL (anonymous).
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: { message: "Must be logged in to claim projects" } },
                { status: 401 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const projectIds: unknown = body.projectIds;

        if (
            !Array.isArray(projectIds) ||
            projectIds.length === 0 ||
            !projectIds.every((id) => typeof id === "string")
        ) {
            return NextResponse.json(
                { error: { message: "projectIds must be a non-empty string array" } },
                { status: 400 }
            );
        }

        // Only claim projects that have no owner (anonymous)
        const result = await prisma.project.updateMany({
            where: {
                id: { in: projectIds as string[] },
                userId: null,
            },
            data: {
                userId: session.user.id,
            },
        });

        return NextResponse.json({ claimed: result.count });
    } catch (error) {
        console.error("Failed to claim projects:", error);
        return NextResponse.json(
            { error: { message: "Failed to claim projects" } },
            { status: 500 }
        );
    }
}
