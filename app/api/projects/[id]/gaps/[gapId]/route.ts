import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/projects/:id/gaps/:gapId — Toggle dismissed state
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; gapId: string }> }
) {
  try {
    const { id: projectId, gapId } = await params;

    // Verify gap belongs to this project
    const gap = await prisma.gap.findFirst({
      where: { id: gapId, projectId },
    });

    if (!gap) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Gap not found" } },
        { status: 404 }
      );
    }

    // Toggle dismissed
    const updated = await prisma.gap.update({
      where: { id: gapId },
      data: { dismissed: !gap.dismissed },
    });

    return NextResponse.json({
      id: updated.id,
      addressed: updated.dismissed,
    });
  } catch (error) {
    console.error("Failed to update gap:", error);
    return NextResponse.json(
      { error: { code: "UPDATE_ERROR", message: "Failed to update gap." } },
      { status: 500 }
    );
  }
}
