"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Button } from "@/components/ui/buttons";
import {
  Eye,
  Trash2,
  ChevronDown,
  ChevronRight,
  Upload,
  X,
} from "lucide-react";

import Dropzone from "@/components/upload/dropzone";
import FileList from "@/components/upload/file-list";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import { AuthGate } from "@/components/auth/AuthGate";

/* ─── Types ─── */
interface DocItem {
  id: string;
  filename: string;
  title: string | null;
  authors: string | null;
  year: number | null;
  chunk_count: number;
  created_at: string;
  tag: string | null;
}

/* ─── Documents Page ─── */
export default function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewDocId, setViewDocId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; id: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/documents`);
      if (!res.ok) throw new Error("Failed to load documents");
      const json = await res.json();
      setDocs(json.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Upload handlers
  const handleFilesAdded = useCallback((files: File[]) => {
    const newEntries = files.map((f) => ({ file: f, id: crypto.randomUUID() }));
    setPendingFiles((prev) => [...prev, ...newEntries]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleUploadFiles = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    setError("");
    let successCount = 0;

    for (let i = 0; i < pendingFiles.length; i++) {
      const f = pendingFiles[i];
      setUploadProgress(`Processing ${f.file.name} (${i + 1}/${pendingFiles.length})...`);
      try {
        const formData = new FormData();
        formData.append("file", f.file);
        const res = await fetch(`/api/projects/${projectId}/documents`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error?.message || "Upload failed");
        }
        successCount++;
      } catch (err) {
        setError((prev) =>
          prev + (prev ? "\n" : "") + `${f.file.name}: ${err instanceof Error ? err.message : "Upload failed"}`
        );
      }
    }

    if (successCount > 0) {
      setUploadProgress("Updating orientation analysis...");
      try {
        await fetch(`/api/projects/${projectId}/orient`, { method: "POST" });
      } catch {
        // Non-fatal
      }
      await fetchDocuments();
    }

    setUploading(false);
    setUploadProgress("");
    setPendingFiles([]);
    setShowUpload(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/documents/${id}`,
        { method: "DELETE" }
      );
      if (res.ok || res.status === 404) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      // silently fail
    }
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1F5C45] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B6B78]">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGate featureName="Documents Manager">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)" }}>Your Documents</h2>
            <p className="text-[#6B6B78]" style={{ fontSize: "14px" }}>
              {docs.length} document{docs.length !== 1 ? "s" : ""} uploaded
            </p>
          </div>
          <Button variant="ghost" onClick={() => setShowUpload(true)}>
            <Upload size={16} /> Add More Documents
          </Button>
        </div>

        {/* Inline Upload Section */}
        {showUpload && (
          <div className="bg-white border border-[#E4E2DC] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#1C1C1E] font-semibold" style={{ fontSize: "16px" }}>
                Upload Documents
              </h3>
              {!uploading && (
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setPendingFiles([]);
                    setError("");
                  }}
                  className="text-[#6B6B78] hover:text-[#1C1C1E] transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {uploading ? (
              <div className="flex flex-col items-center py-8">
                <div
                  className="w-8 h-8 border-[3px] rounded-full animate-spin mb-4"
                  style={{ borderColor: "#E4E2DC", borderTopColor: "#1F5C45" }}
                />
                <p className="text-sm" style={{ color: "#6B6B78" }}>
                  {uploadProgress}
                </p>
              </div>
            ) : (
              <>
                <Dropzone
                  onFilesAdded={handleFilesAdded}
                  maxFiles={20}
                  currentCount={docs.length + pendingFiles.length}
                />
                {pendingFiles.length > 0 && (
                  <div className="mt-4">
                    <FileList
                      files={pendingFiles}
                      onRemove={handleRemoveFile}
                      maxFiles={20}
                    />
                    <Button className="mt-4 w-full" onClick={handleUploadFiles}>
                      <Upload size={16} /> Upload &amp; Process{" "}
                      {pendingFiles.length} file
                      {pendingFiles.length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {error && (
          <p className="text-[#C0392B] text-sm whitespace-pre-line">{error}</p>
        )}

        {docs.length === 0 && !showUpload ? (
          <div className="bg-white border border-[#E4E2DC] rounded-lg p-12 text-center">
            <p className="text-[#6B6B78]" style={{ fontSize: "15px" }}>
              No documents uploaded yet.
            </p>
            <Button
              className="mt-4"
              onClick={() => setShowUpload(true)}
            >
              Upload Documents
            </Button>
          </div>
        ) : (
          /* Table */
          <div className="bg-white border border-[#E4E2DC] rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[48px_1fr_120px_80px_100px_88px] gap-2 px-5 py-3 border-b border-[#E4E2DC] bg-[#FAFAF8]">
              {["#", "Document", "Authors", "Year", "Chunks", "Actions"].map(
                (h) => (
                  <span
                    key={h}
                    className="text-[#6B6B78]"
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {h}
                  </span>
                )
              )}
            </div>

            {/* Table rows */}
            {docs.map((doc, i) => (
              <div key={doc.id}>
                <div
                  className={`grid grid-cols-1 md:grid-cols-[48px_1fr_120px_80px_100px_88px] gap-2 px-5 py-3.5 items-center cursor-pointer transition-colors hover:bg-[#F0EDE6] ${i % 2 === 1 ? "bg-[#FAFAF8]" : "bg-white"
                    }`}
                  onClick={() => toggleExpand(doc.id)}
                >
                  <span
                    className="text-[#6B6B78] hidden md:block"
                    style={{ fontSize: "13px" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    {expandedId === doc.id ? (
                      <ChevronDown
                        size={14}
                        className="text-[#6B6B78] flex-shrink-0"
                      />
                    ) : (
                      <ChevronRight
                        size={14}
                        className="text-[#6B6B78] flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[#1C1C1E] truncate block"
                          style={{ fontSize: "14px" }}
                        >
                          {doc.title || doc.filename}
                        </span>
                        {doc.tag && (
                          <span className={`px-2 py-[2px] rounded-sm text-[10px] font-medium border ${doc.tag === "Highly Useful" ? "bg-[#EBF2EE] text-[#1F5C45] border-[#1F5C45]" :
                              doc.tag === "Reviewing" ? "bg-[#FEF5ED] text-[#D4821A] border-[#D4821A]" :
                                doc.tag === "Not Useful" ? "bg-[#FDF2F0] text-[#C0392B] border-[#C0392B]" :
                                  "bg-[#E4E2DC] text-[#1C1C1E] border-[#6B6B78]"
                            }`}>
                            {doc.tag}
                          </span>
                        )}
                      </div>
                      {doc.title && doc.title !== doc.filename && (
                        <span
                          className="text-[#6B6B78] truncate block"
                          style={{ fontSize: "12px" }}
                        >
                          {doc.filename}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-[#6B6B78] hidden md:block truncate"
                    style={{ fontSize: "13px" }}
                  >
                    {doc.authors || "—"}
                  </span>
                  <span
                    className="text-[#6B6B78] hidden md:block"
                    style={{ fontSize: "13px" }}
                  >
                    {doc.year || "—"}
                  </span>
                  <span
                    className="text-[#6B6B78] hidden md:block"
                    style={{ fontSize: "13px" }}
                  >
                    {doc.chunk_count} chunks
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#EBF2EE] text-[#6B6B78] hover:text-[#1F5C45] transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewDocId(doc.id);
                      }}
                      title="View & Edit"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#FDF2F0] text-[#6B6B78] hover:text-[#C0392B] transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(doc.id);
                      }}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded info */}
                {expandedId === doc.id && (
                  <div className="px-5 py-4 bg-[#F0EDE6] border-t border-[#E4E2DC]">
                    <div className="md:pl-12 space-y-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        {doc.authors && (
                          <span
                            className="text-[#6B6B78]"
                            style={{ fontSize: "13px" }}
                          >
                            Authors: <strong className="text-[#1C1C1E]">{doc.authors}</strong>
                          </span>
                        )}
                        {doc.year && (
                          <span
                            className="text-[#6B6B78]"
                            style={{ fontSize: "13px" }}
                          >
                            Year: <strong className="text-[#1C1C1E]">{doc.year}</strong>
                          </span>
                        )}
                        <span
                          className="px-2 py-0.5 rounded text-white bg-[#1F5C45]"
                          style={{ fontSize: "11px" }}
                        >
                          {doc.chunk_count} chunks embedded
                        </span>
                      </div>
                      <p
                        className="text-[#6B6B78]"
                        style={{ fontSize: "12px" }}
                      >
                        Uploaded {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-5"
            onClick={() => setDeleteId(null)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-[400px] w-full border border-[#E4E2DC]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-[#1C1C1E] mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Remove document?
              </h3>
              <p
                className="text-[#6B6B78] mb-6"
                style={{ fontSize: "14px", lineHeight: 1.5 }}
              >
                This will remove the document and its chunks from your project.
                You may need to re-run orientation analysis after. This action
                cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setDeleteId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(deleteId)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sliding Document Details Panel */}
        <DocumentPanel
          projectId={projectId}
          docId={viewDocId}
          onClose={() => setViewDocId(null)}
          onUpdate={fetchDocuments}
        />
      </div>
    </AuthGate>
  );
}
