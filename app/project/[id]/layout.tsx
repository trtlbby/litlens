"use client";

import { useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LitLensLogo } from "@/components/ui/LitLensLogo";
import { UserMenu } from "@/components/auth/UserMenu";
import { ProjectSwitcher } from "@/components/projects/ProjectSwitcher";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth/AuthContext";
import { Compass, MessageSquare, Search, FolderOpen, Menu, X, Lock, Plus } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const projectId = typeof params?.id === "string" ? params.id : "";

  const { isLoggedIn, projects, activeProject, canCreateProject } = useAuth();
  
  const currentProject = projects.find(p => p.id === projectId) || activeProject;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Dynamic nav items based on the current project ID
  const navItems = [
    { to: `/project/${projectId}`, icon: Compass, label: "Orientation", end: true, requiresAuth: false },
    { to: `/project/${projectId}/ask`, icon: MessageSquare, label: "Ask Your Library", end: false, requiresAuth: true },
    { to: `/project/${projectId}/gaps`, icon: Search, label: "Gap Detection", end: false, requiresAuth: true },
    { to: `/project/${projectId}/documents`, icon: FolderOpen, label: "Documents", end: false, requiresAuth: false },
  ];

  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.requiresAuth && !isLoggedIn) {
      e.preventDefault();
      setShowLogin(true);
    }
  };

  const isActiveProp = (item: typeof navItems[0]) => {
     if (item.end) {
        return pathname === item.to;
     }
     return pathname.startsWith(item.to);
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-[#E4E2DC] px-4 md:px-8 py-3 grid grid-cols-[auto,1fr,auto] items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 cursor-pointer rounded-md hover:bg-[#F0EDE6]"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="cursor-pointer" onClick={() => router.push("/")}>
            <LitLensLogo />
          </div>
        </div>
        <p className="text-[#1C1C1E] truncate text-sm md:text-base font-semibold text-center md:text-left" style={{ fontFamily: "var(--font-heading)" }}>
          {currentProject?.name ?? "Getting your project..."}
        </p>
        <div className="flex items-center justify-end gap-2 md:gap-3">
          {isLoggedIn ? (
            <>
              {canCreateProject && (
                <>
                  <button
                    onClick={() => router.push("/new")}
                    className="hidden md:inline-flex px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F7F5F0] text-[#1C1C1E] cursor-pointer"
                  >
                    New Project
                  </button>
                  <button
                    onClick={() => router.push("/new")}
                    className="md:hidden inline-flex items-center justify-center p-2 rounded-full bg-[#1F5C45] text-white"
                    aria-label="Create project"
                  >
                    <Plus size={18} />
                  </button>
                </>
              )}
              <UserMenu />
            </>
          ) : (
            <>
              <button
                onClick={() => setShowLogin(true)}
                className="text-black hover:opacity-60 transition-opacity bg-transparent border-none outline-none cursor-pointer px-2"
                style={{ fontSize: "14px", fontFamily: "var(--font-body)" }}
              >
                Log in
              </button>
              <button 
                onClick={() => router.push("/new")}
                className="hidden md:inline-flex px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F7F5F0] text-[#1C1C1E] cursor-pointer"
              >
                New Project
              </button>
              <button
                onClick={() => router.push("/new")}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-full bg-[#1F5C45] text-white"
                aria-label="Create project"
              >
                <Plus size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex flex-col w-[240px] bg-white border-r border-[#E4E2DC] py-4 flex-shrink-0">
          <div className="mb-4">
            <ProjectSwitcher />
          </div>

          <div className="px-3 mb-2">
            <div className="h-px bg-[#E4E2DC]" />
          </div>

          <nav className="flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              const isActive = isActiveProp(item);
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  onClick={(e) => handleNavClick(item, e)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    item.requiresAuth && !isLoggedIn
                      ? "text-[#B0B0B8] cursor-pointer"
                      : isActive
                      ? "bg-[#EBF2EE] text-[#1F5C45] border-l-3 border-[#1F5C45]"
                      : "text-[#6B6B78] hover:bg-[#F7F5F0] hover:text-[#1C1C1E]"
                  }`}
                  style={{ fontSize: "14px" }}
                >
                  <item.icon size={20} />
                  <span className="flex-1">{item.label}</span>
                  {item.requiresAuth && !isLoggedIn && <Lock size={13} className="text-[#B0B0B8]" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Sidebar - Mobile */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setMobileNavOpen(false)}>
            <aside
              className="w-[260px] bg-white h-full py-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 mb-4">
                <LitLensLogo />
              </div>
              <div className="mb-4">
                <ProjectSwitcher />
              </div>
              <div className="mx-3 mb-2 h-px bg-[#E4E2DC]" />
              <nav className="flex flex-col gap-1 px-3">
                {navItems.map((item) => {
                  const isActive = isActiveProp(item);
                  return (
                    <Link
                      key={item.to}
                      href={item.to}
                      onClick={(e) => {
                        handleNavClick(item, e);
                        if (!item.requiresAuth || isLoggedIn) setMobileNavOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                        item.requiresAuth && !isLoggedIn
                          ? "text-[#B0B0B8] cursor-pointer"
                          : isActive
                          ? "bg-[#EBF2EE] text-[#1F5C45] border-l-3 border-[#1F5C45]"
                          : "text-[#6B6B78] hover:bg-[#F7F5F0] hover:text-[#1C1C1E]"
                      }`}
                      style={{ fontSize: "14px" }}
                    >
                      <item.icon size={20} />
                      <span className="flex-1">{item.label}</span>
                      {item.requiresAuth && !isLoggedIn && <Lock size={13} className="text-[#B0B0B8]" />}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 pb-24 md:pb-8">
          <div className="max-w-[1040px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Tab Bar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E4E2DC] px-2 py-1.5 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const isActive = isActiveProp(item);
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={(e) => handleNavClick(item, e)}
                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-md transition-colors ${
                  item.requiresAuth && !isLoggedIn
                    ? "text-[#B0B0B8]"
                    : isActive
                    ? "text-[#1F5C45] bg-[#EBF2EE]"
                    : "text-[#6B6B78] hover:bg-[#F7F5F0] hover:text-[#1C1C1E]"
                }`}
              >
                <item.icon size={18} />
                <span className="text-[11px] font-medium leading-none">{item.label.replace("Your Library", "Ask")}</span>
                {item.requiresAuth && !isLoggedIn && <Lock size={12} className="text-[#B0B0B8]" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
