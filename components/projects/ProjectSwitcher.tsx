"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth, type Project } from "../auth/AuthContext";
import {
  ChevronDown,
  FolderOpen,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";

export function ProjectSwitcher() {
  const {
    isLoggedIn,
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    deleteProject,
    renameProject,
    maxProjects,
    canCreateProject,
  } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingId(null);
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (id: string) => {
    setActiveProjectId(id);
    setOpen(false);
    setEditingId(null);
    setConfirmDeleteId(null);
    router.push(`/project/${id}`);
  };

  const startRename = (p: Project) => {
    setEditingId(p.id);
    setEditValue(p.name);
    setConfirmDeleteId(null);
  };

  const confirmRename = () => {
    if (editingId && editValue.trim()) {
      renameProject(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    setConfirmDeleteId(null);
    // If we deleted the active project, route away from it
    if (activeProjectId === id) {
      router.push("/");
    }
  };

  if (!isLoggedIn) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-3 mx-3 rounded-md"
        style={{ backgroundColor: "#F7F5F0", border: "1px solid #E4E2DC", fontSize: "13px", color: "#6B6B78" }}
      >
        <Lock size={14} />
        <span>Log in to manage projects</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative mx-3">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer hover:bg-[#F7F5F0]"
        style={{ border: "1px solid #E4E2DC", backgroundColor: "white", fontSize: "13px" }}
      >
        <FolderOpen size={16} className="text-[#1F5C45] flex-shrink-0" />
        <span className="flex-1 text-left truncate text-[#1C1C1E]" style={{ fontWeight: 500 }}>
          {activeProject?.name ?? "No project"}
        </span>
        <ChevronDown
          size={14}
          className="text-[#6B6B78] flex-shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-lg overflow-hidden"
          style={{
            backgroundColor: "white",
            border: "1px solid #E4E2DC",
            boxShadow: "0 8px 32px rgba(31,28,24,0.12)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ borderBottom: "1px solid #E4E2DC" }}
          >
            <span style={{ fontSize: "11px", color: "#6B6B78", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Projects ({projects.length}/{maxProjects})
            </span>
          </div>

          {/* Project list */}
          <div className="max-h-[260px] overflow-y-auto py-1">
            {projects.map((p) => (
              <div key={p.id}>
                {editingId === p.id ? (
                  <div className="flex items-center gap-1 px-3 py-2">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded border border-[#1F5C45] bg-white outline-none"
                      style={{ fontSize: "13px" }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button onClick={confirmRename} className="p-1 text-[#1F5C45] hover:bg-[#EBF2EE] rounded cursor-pointer">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-[#6B6B78] hover:bg-[#F7F5F0] rounded cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                ) : confirmDeleteId === p.id ? (
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-2" style={{ fontSize: "12px", color: "#C0392B" }}>
                      <AlertTriangle size={13} />
                      <span>Delete "{p.name}"?</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="flex-1 py-1.5 rounded text-white cursor-pointer"
                        style={{ backgroundColor: "#C0392B", fontSize: "12px" }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 py-1.5 rounded border border-[#E4E2DC] cursor-pointer"
                        style={{ fontSize: "12px", color: "#6B6B78" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors group ${
                      p.id === activeProjectId ? "bg-[#EBF2EE]" : "hover:bg-[#F7F5F0]"
                    }`}
                    onClick={() => handleSelect(p.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{
                          fontSize: "13px",
                          fontWeight: p.id === activeProjectId ? 600 : 400,
                          color: p.id === activeProjectId ? "#1F5C45" : "#1C1C1E",
                        }}
                      >
                        {p.name}
                      </p>
                      <p className="truncate" style={{ fontSize: "11px", color: "#6B6B78" }}>
                        {p.fileCount} files · {p.lastAccessed}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(p);
                        }}
                        className="p-1.5 rounded hover:bg-white text-[#6B6B78] hover:text-[#1C1C1E] cursor-pointer"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(p.id);
                        }}
                        className="p-1.5 rounded hover:bg-white text-[#6B6B78] hover:text-[#C0392B] cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #E4E2DC" }}>
            <button
              onClick={() => {
                setOpen(false);
                if (canCreateProject) {
                  router.push("/new");
                }
              }}
              disabled={!canCreateProject}
              className="w-full flex items-center gap-2 px-4 py-3 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F5F0]"
              style={{ fontSize: "13px", color: "#1F5C45" }}
            >
              <Plus size={14} />
              <span>New Project</span>
              {!canCreateProject && (
                <span style={{ fontSize: "11px", color: "#6B6B78", marginLeft: "auto" }}>Limit reached</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
