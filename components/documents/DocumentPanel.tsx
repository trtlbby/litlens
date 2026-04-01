"use client";

import { useState, useEffect } from "react";
import { X, Save, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/buttons";

interface Chunk {
  id: string;
  chunkIndex: number;
  text: string;
}

interface DocumentDetail {
  id: string;
  filename: string;
  title: string | null;
  authors: string | null;
  year: number | null;
  tag: string | null;
  createdAt: string;
  chunks: Chunk[];
}

interface DocumentPanelProps {
  projectId: string;
  docId: string | null;
  onClose: () => void;
  onUpdate: () => void; // Triggered when tag/title changes
}

export function DocumentPanel({ projectId, docId, onClose, onUpdate }: DocumentPanelProps) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editable states
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");

  useEffect(() => {
    if (!docId) {
      setDoc(null);
      return;
    }
    
    const fetchDoc = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/documents/${docId}`);
        if (res.ok) {
          const data = await res.json();
          setDoc(data);
          setTitle(data.title || data.filename);
          setTag(data.tag || "");
        }
      } catch (err) {
        console.error("Failed to fetch document details");
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [projectId, docId]);

  const handleSave = async () => {
    if (!docId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, tag }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDoc((prev) => (prev ? { ...prev, title: updated.title, tag: updated.tag } : null));
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!doc) return;
    const fullText = doc.chunks.map(c => c.text).join("\n\n");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      {docId && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[540px] bg-[#F7F5F0] shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col border-l border-[#E4E2DC] ${
          docId ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E4E2DC] bg-white">
          <h3 className="text-[#1C1C1E] font-medium truncate pr-4" style={{ fontFamily: "var(--font-heading)", fontSize: "18px" }}>
            Document Details
          </h3>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-[#6B6B78] hover:text-[#1C1C1E] hover:bg-[#F0EDE6] rounded-md transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#1F5C45] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[#6B6B78] text-sm">Loading document chunks...</p>
          </div>
        ) : doc ? (
          <div className="flex-1 overflow-y-auto">
            {/* Metadata & Editing Section */}
            <div className="p-6 bg-white border-b border-[#E4E2DC]">
              <div className="space-y-4">
                
                {/* Title Input */}
                <div>
                  <label className="block text-xs font-semibold text-[#6B6B78] uppercase tracking-wider mb-2">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E4E2DC] rounded-md text-[#1C1C1E] text-sm focus:outline-none focus:border-[#1F5C45]"
                  />
                  {doc.filename !== title && (
                    <p className="text-xs text-[#8A8A93] mt-1 truncate">Original file: {doc.filename}</p>
                  )}
                </div>

                {/* Status/Tag Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#6B6B78] uppercase tracking-wider mb-2">
                    Relevance Tag
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "", label: "Untagged" },
                      { value: "Highly Useful", label: "Highly Useful", color: "bg-[#EBF2EE] text-[#1F5C45] border-[#1F5C45]" },
                      { value: "Reviewing", label: "Reviewing", color: "bg-[#FEF5ED] text-[#D4821A] border-[#D4821A]" },
                      { value: "Not Useful", label: "Not Useful", color: "bg-[#FDF2F0] text-[#C0392B] border-[#C0392B]" }
                    ].map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTag(t.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                          tag === t.value 
                            ? (t.color || "bg-[#E4E2DC] text-[#1C1C1E] border-[#6B6B78]") 
                            : "bg-white text-[#6B6B78] border-[#E4E2DC] hover:border-[#B0B0B8]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <Button 
                    onClick={handleSave} 
                    disabled={saving || (title === (doc.title || doc.filename) && tag === (doc.tag || ""))}
                    className="w-full justify-center"
                  >
                    {saving ? "Saving..." : <><Save size={16} className="mr-2" /> Save Changes</>}
                  </Button>
                </div>
              </div>
            </div>

            {/* Extracted Chunks Viewer */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[#1C1C1E] font-medium" style={{ fontSize: "15px" }}>Extracted Text Chunks</h4>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#6B6B78]">{doc.chunks.length} chunks</span>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-[#1F5C45] hover:opacity-80 transition-opacity cursor-pointer font-medium"
                  >
                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy All"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {doc.chunks.map((chunk) => (
                  <div 
                    key={chunk.id}
                    className="p-4 bg-white border border-[#E4E2DC] rounded-lg shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-[#8A8A93] tracking-widest">
                        Chunk {chunk.chunkIndex + 1}
                      </span>
                      <span className="text-[10px] text-[#8A8A93]">
                        {chunk.text.length} chars
                      </span>
                    </div>
                    <p 
                      className="text-[#1C1C1E] leading-relaxed" 
                      style={{ fontSize: "13px" }}
                    >
                      {chunk.text}
                    </p>
                  </div>
                ))}
                
                {doc.chunks.length === 0 && (
                  <div className="text-center py-10 bg-white border border-[#E4E2DC] border-dashed rounded-lg">
                    <p className="text-sm text-[#6B6B78]">No text chunks found for this document.</p>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-[#6B6B78]">
            Something went wrong.
          </div>
        )}
      </div>
    </>
  );
}
