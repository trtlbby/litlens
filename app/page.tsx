"use client";

import { useRouter } from "next/navigation";
import { LitLensLogo } from "@/components/ui/LitLensLogo";
import { Compass, MessageSquare, Search } from "lucide-react";
import { LoginModal } from "@/components/auth/LoginModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/components/auth/AuthContext";
import { useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const { isLoggedIn, projects } = useAuth();
  
  // Since we don't have a distinct "Button" component with variants, 
  // I will create inline styles for the button component or use plain HTML buttons 
  // with tailwind styles that match the original code.

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      {/* Header */}
      <header className="w-full px-10 py-5 flex items-center justify-between max-w-[1280px] mx-auto md:px-10 px-5">
        <LitLensLogo />
        <div className="flex items-center gap-6">
          {isLoggedIn ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="text-black hover:opacity-60 transition-opacity bg-transparent border-none outline-none cursor-pointer"
              style={{ fontSize: "15px", fontFamily: "var(--font-body)" }}
            >
              Log in
            </button>
          )}
          
          <button 
             onClick={() => {
                if (isLoggedIn) {
                   if (projects.length > 0) {
                      router.push(`/project/${projects[0].id}`);
                   } else {
                      router.push('/new');
                   }
                } else {
                   router.push('/new');
                }
             }}
             className="px-6 py-2.5 rounded-lg text-white transition-opacity hover:opacity-90 font-medium cursor-pointer"
             style={{ backgroundColor: "#1F5C45", fontSize: "15px" }}
          >
            {isLoggedIn ? "My Projects" : "Get Started"}
          </button>
        </div>
      </header>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 md:px-10">
        <div className="max-w-[800px] text-center mt-[-40px]">
          {/* Abstract geometric shapes */}
          <div className="flex justify-center gap-4 mb-10">
            <div className="w-16 h-1 bg-[#4A7C59] rounded-full opacity-40" />
            <div className="w-8 h-8 border-2 border-[#3D6B9A] rounded opacity-30 rotate-12" />
            <div className="w-12 h-1 bg-[#8C5E7A] rounded-full opacity-40 mt-4" />
            <div className="w-6 h-6 border-2 border-[#B5614A] opacity-30 -rotate-6" />
            <div className="w-14 h-1 bg-[#8A7D3E] rounded-full opacity-40 mt-2" />
          </div>

          <h1 className="mb-6 font-semibold" style={{ fontSize: "clamp(32px, 5vw, 48px)", fontFamily: "var(--font-heading)", color: "#1C1C1E" }}>
            Understand your literature.
            <br />
            Not just collect it.
          </h1>

          <p className="text-[#6B6B78] mb-10 max-w-[560px] mx-auto" style={{ fontSize: "17px", lineHeight: 1.6 }}>
            Upload your research question and PDFs — get thematic clusters, alignment assessment, cited Q&A, and gap analysis in seconds.
          </p>

          <button 
            onClick={() => router.push("/new")}
            className="px-8 py-3 rounded-lg text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: "#1F5C45", fontSize: "16px", fontWeight: 500 }}
          >
            Start a New Project
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[960px] mt-20 mb-16 w-full">
          <FeatureCard
            icon={<Compass size={24} className="text-[#1F5C45]" />}
            title="Orientation View"
            description="See how your library aligns with your research question at a glance."
          />
          <FeatureCard
            icon={<MessageSquare size={24} className="text-[#1F5C45]" />}
            title="Q&A with Citations"
            description="Ask questions and get answers grounded in your actual documents."
          />
          <FeatureCard
            icon={<Search size={24} className="text-[#1F5C45]" />}
            title="Gap Detection"
            description="Discover what's missing from your literature before your committee does."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-[#6B6B78]" style={{ fontSize: "12px", letterSpacing: "0.04em" }}>
        LitLens · University of Nueva Caceres, School of Computer and Information Sciences
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white border border-[#E4E2DC] rounded-lg p-6 text-center shadow-sm">
      <div className="w-12 h-12 rounded-lg bg-[#EBF2EE] flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="mb-2 font-medium" style={{ color: "#1C1C1E", fontSize: "18px" }}>{title}</h3>
      <p className="text-[#6B6B78]" style={{ fontSize: "14px", lineHeight: 1.6 }}>
        {description}
      </p>
    </div>
  );
}
