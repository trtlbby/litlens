"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LitLensLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/buttons";
import { Compass, MessageSquare, Search, FolderOpen, Menu, X } from "lucide-react";
import { useState, use } from "react";

const getNavItems = (projectId: string) => [
  { href: `/project/${projectId}`, icon: Compass, label: "Orientation", exact: true },
  { href: `/project/${projectId}/ask`, icon: MessageSquare, label: "Ask Your Library", exact: false },
  { href: `/project/${projectId}/gaps`, icon: Search, label: "Gap Detection", exact: false },
  { href: `/project/${projectId}/documents`, icon: FolderOpen, label: "Documents", exact: false },
];

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navItems = getNavItems(id);

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-[#E4E2DC] px-5 md:px-8 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            className="md:hidden p-2 cursor-pointer"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/">
            <LitLensLogo />
          </Link>
        </div>
        <p
          className="hidden md:block text-[#1C1C1E]"
          style={{ fontSize: "14px", fontWeight: 500 }}
        >
          Literature Review Project
        </p>
        <Button variant="ghost" onClick={() => router.push("/new")}>
          New Project
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Desktop */}
        <aside className="hidden md:flex flex-col w-[240px] bg-white border-r border-[#E4E2DC] py-4 flex-shrink-0">
          <nav className="flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md no-underline transition-colors ${
                    active
                      ? "bg-[#EBF2EE] text-[#1F5C45]"
                      : "text-[#6B6B78] hover:bg-[#F7F5F0] hover:text-[#1C1C1E]"
                  }`}
                  style={{
                    fontSize: "14px",
                    borderLeft: active ? "3px solid #1F5C45" : "3px solid transparent",
                  }}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Sidebar — Mobile */}
        {mobileNavOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/30"
            onClick={() => setMobileNavOpen(false)}
          >
            <aside
              className="w-[260px] bg-white h-full py-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 mb-4">
                <LitLensLogo />
              </div>
              <nav className="flex flex-col gap-1 px-3">
                {navItems.map((item) => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-md no-underline transition-colors ${
                        active
                          ? "bg-[#EBF2EE] text-[#1F5C45]"
                          : "text-[#6B6B78] hover:bg-[#F7F5F0] hover:text-[#1C1C1E]"
                      }`}
                      style={{
                        fontSize: "14px",
                        borderLeft: active ? "3px solid #1F5C45" : "3px solid transparent",
                      }}
                    >
                      <item.icon size={20} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <div className="max-w-[1040px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
