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

/**
 * GET /api/projects/:id/documents/:docId — Fetch document and all chunks
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: projectId, docId } = await params;

    const pAccess = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!pAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await verifyProjectAccess(pAccess.userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const doc = await prisma.document.findFirst({
      where: { id: docId, projectId },
      select: {
        id: true,
        filename: true,
        title: true,
        authors: true,
        year: true,
        tag: true,
        createdAt: true,
        chunks: {
          orderBy: { chunkIndex: "asc" },
          select: {
            id: true,
            chunkIndex: true,
            text: true,
          }
        }
      }
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error("Failed to fetch document:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/:id/documents/:docId — Update document title/tag
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: projectId, docId } = await params;

    const pAccess = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!pAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await verifyProjectAccess(pAccess.userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    
    // Validate the document belongs to project
    const docCheck = await prisma.document.findFirst({
      where: { id: docId, projectId }
    });

    if (!docCheck) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updatedDoc = await prisma.document.update({
      where: { id: docId },
      data: {
        title: body.title !== undefined ? body.title : docCheck.title,
        tag: body.tag !== undefined ? (body.tag === "" ? null : body.tag) : docCheck.tag,
      }
    });

    return NextResponse.json(updatedDoc);
  } catch (error) {
    console.error("Failed to update document:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}
