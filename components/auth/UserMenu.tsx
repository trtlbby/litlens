"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { User, LogOut, Settings, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserMenu() {
  const { user, logout, projects, maxProjects } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer"
        style={{ backgroundColor: "#1F5C45", color: "white", fontSize: "12px", fontWeight: 600 }}
      >
        {initials}
      </button>

      {open && (
        <div
          className="fixed md:absolute right-4 md:right-0 top-[60px] md:top-[calc(100%+8px)] w-[calc(100vw-2rem)] md:w-[260px] max-w-[260px] rounded-lg overflow-hidden z-50"
          style={{
            backgroundColor: "white",
            border: "1px solid #E4E2DC",
            boxShadow: "0 8px 32px rgba(31,28,24,0.12)",
          }}
        >
          {/* User info */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #E4E2DC" }}>
            <p className="truncate" style={{ fontSize: "14px", fontWeight: 500, color: "#1C1C1E" }}>{user.name}</p>
            <p className="truncate" style={{ fontSize: "12px", color: "#6B6B78" }}>{user.email}</p>
          </div>

          {/* Stats */}
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid #E4E2DC" }}>
            <FolderOpen size={14} className="text-[#6B6B78]" />
            <span style={{ fontSize: "12px", color: "#6B6B78" }}>
              {projects.length} / {maxProjects} projects used
            </span>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F5F0] transition-colors cursor-pointer outline-none"
              style={{ fontSize: "13px", color: "#1C1C1E" }}
            >
              <User size={15} className="text-[#6B6B78]" />
              Account Settings
            </button>
            <button
              onClick={() => {
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F5F0] transition-colors cursor-pointer outline-none"
              style={{ fontSize: "13px", color: "#1C1C1E" }}
            >
              <Settings size={15} className="text-[#6B6B78]" />
              Preferences
            </button>
          </div>

          <div style={{ borderTop: "1px solid #E4E2DC" }}>
            <button
              onClick={() => {
                logout();
                setOpen(false);
                router.push("/");
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FFF5F5] transition-colors cursor-pointer outline-none"
              style={{ fontSize: "13px", color: "#C0392B" }}
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
