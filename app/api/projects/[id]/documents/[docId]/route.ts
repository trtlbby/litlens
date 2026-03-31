import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyProjectAccess } from "@/lib/auth";

/**
 * DELETE /api/projects/:id/documents/:docId — Remove a document and all its chunks
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: projectId, docId } = await params;

    const pAccess = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!pAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await verifyProjectAccess(pAccess.userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // First check if the document belongs to this project
    const doc = await prisma.document.findFirst({
      where: { id: docId, projectId },
    });

    if (!doc) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    // Delete cascades will handle chunks, chunk_clusters, qa_sources
    await prisma.document.delete({ where: { id: docId } });

    return NextResponse.json({ deleted: true, id: docId });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { error: { code: "DELETE_ERROR", message: "Failed to delete document" } },
      { status: 500 }
    );
  }
}
