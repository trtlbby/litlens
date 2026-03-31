"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { signIn, signOut, useSession, SessionProvider } from "next-auth/react";

export interface Project {
  id: string;
  name: string;
  question: string;
  fileCount: number;
  createdAt: string;
  lastAccessed: string;
}

export interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string) => void;
  logout: () => void;
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  setActiveProjectId: (id: string) => void;
  addProject: (name: string, question: string) => boolean;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  refreshProjects: () => Promise<void>;
  maxProjects: number;
  canCreateProject: boolean;
}

const MAX_PROJECTS = 5;

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  
  const user = session?.user ? {
    name: session.user.name || session.user.email?.split("@")[0] || "User",
    email: session.user.email || "",
    avatar: session.user.image || undefined,
  } : null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Fetch projects when user logs in
  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        const savedId = localStorage.getItem("litlens_active_project");
        if (savedId && data.find(p => p.id === savedId)) {
          setActiveProjectId(savedId);
        } else if (data.length > 0) {
          setActiveProjectId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      refreshProjects();
    } else if (status === "unauthenticated") {
      setProjects([]);
      setActiveProjectId(null);
    }
  }, [status, refreshProjects]);

  // Sync activeProjectId to localStorage so it persists between reloads
  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem("litlens_active_project", activeProjectId);
    }
  }, [activeProjectId]);

  const login = useCallback((email: string) => {
    signIn("nodemailer", { email, redirect: false });
  }, []);

  const logout = useCallback(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  const addProject = useCallback(
    (name: string, question: string): boolean => {
      // Stub for UI - real creation happens in POST /api/projects
      return true;
    },
    []
  );

  const deleteProject = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/projects/${id}`, { method: "DELETE" });
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (activeProjectId === id) {
          setActiveProjectId((prev) => {
            const remaining = projects.filter((p) => p.id !== id);
            return remaining.length > 0 ? remaining[0].id : null;
          });
        }
      } catch (err) {
        console.error("Failed to delete", err);
      }
    },
    [activeProjectId, projects]
  );

  const renameProject = useCallback(async (id: string, name: string) => {
    try {
      await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name })
      });
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    } catch (err) {
      console.error("Failed to rename", err);
    }
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: status === "authenticated",
        login,
        logout,
        projects,
        activeProjectId,
        activeProject,
        setActiveProjectId,
        addProject,
        deleteProject,
        renameProject,
        refreshProjects,
        maxProjects: MAX_PROJECTS,
        canCreateProject: projects.length < MAX_PROJECTS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
   return (
      <SessionProvider>
         <AuthProviderInner>{children}</AuthProviderInner>
      </SessionProvider>
   );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
