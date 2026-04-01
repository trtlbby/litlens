"use client";

import { useRouter } from "next/navigation";
import { LitLensLogo } from "@/components/ui/LitLensLogo";
import { Compass, MessageSquare, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/components/auth/AuthContext";
import { useState, useEffect } from "react";

const LoginModal = dynamic(() =>
  import("@/components/auth/LoginModal").then((mod) => mod.LoginModal)
);

const SplashScreen = dynamic(() =>
  import("@/components/ui/splash-screen").then((mod) => mod.SplashScreen)
);

export default function LandingPage() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  // Start false to avoid server/client markup mismatch; enable in effect if needed
  const [showSplash, setShowSplash] = useState(false);
  const { isLoggedIn, projects } = useAuth();
  
  useEffect(() => {
    // Only show splash once per session; defer decision to client to keep SSR/CSR in sync
    const hasSeen = sessionStorage.getItem("litlens_splashed");
    if (!hasSeen) {
      setShowSplash(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem("litlens_splashed", "true");
    setShowSplash(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {/* Header */}
      <header className="w-full max-w-[1280px] px-5 md:px-10 py-5 flex items-center justify-between gap-3 md:gap-6 mx-auto">
        <LitLensLogo />
        <div className="flex items-center gap-3 md:gap-6">
          {isLoggedIn ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="text-black hover:opacity-60 transition-opacity bg-transparent border-none outline-none cursor-pointer px-2 py-1"
              style={{ fontSize: "14px", fontFamily: "var(--font-body)" }}
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
             className="px-5 py-2.5 md:px-6 rounded-lg text-white transition-opacity hover:opacity-90 font-medium cursor-pointer text-sm md:text-base"
             style={{ backgroundColor: "#1F5C45" }}
          >
            {isLoggedIn ? "My Projects" : "Get Started"}
          </button>
        </div>
      </header>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 md:px-10 w-full">
        <div className="w-full max-w-[800px] text-center mt-[-10px] md:mt-[-40px]">
          {/* Abstract geometric shapes */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 md:mb-10">
            <div className="w-16 h-1 bg-[#4A7C59] rounded-full opacity-40" />
            <div className="w-8 h-8 border-2 border-[#3D6B9A] rounded opacity-30 rotate-12" />
            <div className="w-12 h-1 bg-[#8C5E7A] rounded-full opacity-40 mt-4" />
            <div className="w-6 h-6 border-2 border-[#B5614A] opacity-30 -rotate-6" />
            <div className="w-14 h-1 bg-[#8A7D3E] rounded-full opacity-40 mt-2" />
          </div>

          <h1 className="mb-4 md:mb-6 font-semibold" style={{ fontSize: "clamp(30px, 6vw, 48px)", fontFamily: "var(--font-heading)", color: "#1C1C1E" }}>
            Understand your literature.
            <br />
            Not just collect it.
          </h1>

          <p className="text-[#4A4A4A] mb-8 md:mb-10 max-w-[560px] mx-auto" style={{ fontSize: "16px", lineHeight: 1.6 }}>
            Upload your research question and PDFs — get thematic clusters, alignment assessment, cited Q&A, and gap analysis in seconds.
          </p>

          <button 
            onClick={() => router.push("/new")}
            className="px-6 sm:px-8 py-3 rounded-lg text-white transition-opacity hover:opacity-90 cursor-pointer w-full sm:w-auto"
            style={{ backgroundColor: "#1F5C45", fontSize: "16px", fontWeight: 600 }}
          >
            Start a New Project
          </button>
        </div>

        {/* Features */}
        <div className="w-full max-w-[960px] mt-14 md:mt-20 mb-16 px-1 sm:px-2">
          <h2 className="sr-only">Key capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 w-full">
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
    <div className="bg-white border border-[#E4E2DC] rounded-lg p-4 sm:p-5 md:p-6 shadow-sm flex items-center gap-4 md:flex-col md:text-center md:items-center md:gap-3">
      <div className="w-12 h-12 rounded-lg bg-[#EBF2EE] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="text-left md:text-center">
        <h3 className="mb-1 md:mb-2 font-medium" style={{ color: "#1C1C1E", fontSize: "17px" }}>{title}</h3>
        <p className="text-[#4A4A4A]" style={{ fontSize: "14px", lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </div>
  );
}
