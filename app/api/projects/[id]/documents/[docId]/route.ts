import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/projects/:id/documents/:docId — Remove a document and all its chunks
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: projectId, docId } = await params;

    // Verify the document belongs to this project
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
