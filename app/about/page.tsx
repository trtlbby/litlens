"use client";

import { useRouter } from "next/navigation";
import { LitLensLogo } from "@/components/ui/LitLensLogo";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/components/auth/AuthContext";
import {
  Compass,
  MessageSquare,
  Search,
  FolderOpen,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Building2,
  Lightbulb,
  Zap,
  Shield,
  Globe,
  ChevronRight,
} from "lucide-react";

export default function AboutPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E4E2DC] px-5 md:px-10 py-4 flex items-center justify-between gap-4 mx-auto w-full max-w-[1280px]">
        <div className="cursor-pointer" onClick={() => router.push("/")}>
          <LitLensLogo />
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          {isLoggedIn ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => router.push("/")}
              className="text-black hover:opacity-60 transition-opacity bg-transparent border-none outline-none cursor-pointer px-2 py-1"
              style={{ fontSize: "14px", fontFamily: "var(--font-body)" }}
            >
              Home
            </button>
          )}
          <button
            onClick={() => router.push("/new")}
            className="px-5 py-2.5 rounded-lg text-white transition-opacity hover:opacity-90 font-medium cursor-pointer text-sm"
            style={{ backgroundColor: "#1F5C45" }}
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-28 px-5 md:px-10">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #1F5C45 0%, transparent 70%)" }} />
          <div className="absolute bottom-10 right-[15%] w-96 h-96 rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #3D6B9A 0%, transparent 70%)" }} />
          <div className="absolute top-40 right-[8%] w-48 h-48 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #8C5E7A 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-[800px] mx-auto text-center relative z-10">
          {/* Decorative line */}
          <div className="flex justify-center gap-2 mb-8">
            <div className="w-8 h-[3px] rounded-full bg-[#1F5C45] opacity-60" />
            <div className="w-4 h-[3px] rounded-full bg-[#3D6B9A] opacity-40" />
            <div className="w-6 h-[3px] rounded-full bg-[#8C5E7A] opacity-30" />
          </div>

          <p
            className="text-[#1F5C45] mb-4 font-medium tracking-wide"
            style={{ fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            About LitLens
          </p>
          <h1
            className="mb-6 font-semibold text-[#1C1C1E]"
            style={{ fontSize: "clamp(28px, 5vw, 44px)", fontFamily: "var(--font-heading)", lineHeight: 1.2 }}
          >
            Your AI-powered research
            <br />
            <span style={{ color: "#1F5C45" }}>literature companion</span>
          </h1>
          <p
            className="text-[#4A4A4A] max-w-[580px] mx-auto"
            style={{ fontSize: "17px", lineHeight: 1.7 }}
          >
            LitLens is a smart research tool that transforms how you interact with your academic literature.
            Upload your PDFs, define your research question, and let AI help you understand, organize, and
            discover gaps in your reading — all in one place.
          </p>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-12 md:py-16 px-5 md:px-10 bg-white border-y border-[#E4E2DC]">
        <div className="max-w-[900px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2px_1fr] gap-8 md:gap-12 items-center">
            <div>
              <h2 className="text-[#1C1C1E] mb-3" style={{ fontFamily: "var(--font-heading)", fontSize: "24px" }}>
                The Problem
              </h2>
              <p className="text-[#4A4A4A]" style={{ fontSize: "15px", lineHeight: 1.7 }}>
                Researchers spend weeks reading PDFs, manually tagging papers, and trying to figure out
                what their library actually covers. They often miss critical gaps until their committee
                points them out — or worse, during peer review.
              </p>
            </div>
            <div className="hidden md:block h-full bg-gradient-to-b from-transparent via-[#1F5C45] to-transparent opacity-30" />
            <div>
              <h2 className="text-[#1F5C45] mb-3" style={{ fontFamily: "var(--font-heading)", fontSize: "24px" }}>
                Our Solution
              </h2>
              <p className="text-[#4A4A4A]" style={{ fontSize: "15px", lineHeight: 1.7 }}>
                LitLens automates the tedious parts — clustering your documents by theme, scoring alignment
                with your research question, answering questions with cited passages, and detecting gaps —
                so you can focus on the research that matters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 px-5 md:px-10">
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <p
              className="text-[#1F5C45] mb-3 font-medium"
              style={{ fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              How It Works
            </p>
            <h2 className="text-[#1C1C1E]" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(22px, 4vw, 32px)" }}>
              From PDFs to insights in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
            {[
              { step: "01", icon: FolderOpen, title: "Upload", desc: "Drop your research PDFs and define your question" },
              { step: "02", icon: Compass, title: "Orient", desc: "AI clusters documents and scores alignment" },
              { step: "03", icon: MessageSquare, title: "Ask", desc: "Query your library with cited, grounded answers" },
              { step: "04", icon: Search, title: "Discover", desc: "Find gaps and missing perspectives in your reading" },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                <div className="bg-white border border-[#E4E2DC] rounded-xl p-6 text-center hover:shadow-lg hover:border-[#1F5C45]/30 transition-all duration-300 group h-full">
                  <div
                    className="text-[#1F5C45]/20 font-bold mb-3 group-hover:text-[#1F5C45]/40 transition-colors"
                    style={{ fontSize: "36px", fontFamily: "var(--font-heading)" }}
                  >
                    {item.step}
                  </div>
                  <div className="w-12 h-12 mx-auto rounded-lg bg-[#EBF2EE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <item.icon size={22} className="text-[#1F5C45]" />
                  </div>
                  <h3 className="text-[#1C1C1E] font-semibold mb-2" style={{ fontSize: "17px" }}>{item.title}</h3>
                  <p className="text-[#6B6B78]" style={{ fontSize: "14px", lineHeight: 1.5 }}>{item.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-[#E4E2DC]">
                    <ChevronRight size={20} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-16 md:py-24 px-5 md:px-10 bg-white border-y border-[#E4E2DC]">
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-[#1F5C45] mb-3 font-medium" style={{ fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Core Features
            </p>
            <h2 className="text-[#1C1C1E]" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(22px, 4vw, 32px)" }}>
              Everything you need to master your literature
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: Compass,
                title: "Thematic Clustering",
                desc: "AI groups your documents into meaningful themes and rates how relevant each cluster is to your research question.",
                color: "#4A7C59",
              },
              {
                icon: Zap,
                title: "Alignment Scoring",
                desc: "A calibrated hybrid score tells you how well your library actually supports your research question — not just how similar the words are.",
                color: "#3D6B9A",
              },
              {
                icon: MessageSquare,
                title: "Cited Q&A",
                desc: "Ask any question about your literature and get answers grounded in your actual documents, with verifiable source passages.",
                color: "#8C5E7A",
              },
              {
                icon: Search,
                title: "Gap Detection",
                desc: "Discover underrepresented topics and missing perspectives before your reviewers do. Get suggested search terms to fill gaps.",
                color: "#B5614A",
              },
              {
                icon: Shield,
                title: "Smart Auto-Tagging",
                desc: "Documents are automatically tagged as Highly Useful, Not Useful, or Untagged based on AI-judged relevance to your question.",
                color: "#8A7D3E",
              },
              {
                icon: Globe,
                title: "Works Offline",
                desc: "Service worker caching lets you browse your project data even without an internet connection. Fast reloads guaranteed.",
                color: "#5B7D8E",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-[#F7F5F0] border border-[#E4E2DC] rounded-xl p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <feature.icon size={20} style={{ color: feature.color }} />
                  </div>
                  <div>
                    <h3 className="text-[#1C1C1E] font-semibold mb-1.5" style={{ fontSize: "16px" }}>{feature.title}</h3>
                    <p className="text-[#6B6B78]" style={{ fontSize: "14px", lineHeight: 1.6 }}>{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is LitLens For */}
      <section className="py-16 md:py-24 px-5 md:px-10">
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-[#1F5C45] mb-3 font-medium" style={{ fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Who Is LitLens For?
            </p>
            <h2 className="text-[#1C1C1E] mb-4" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(22px, 4vw, 32px)" }}>
              Built for anyone who reads research
            </h2>
            <p className="text-[#6B6B78] max-w-[580px] mx-auto" style={{ fontSize: "15px", lineHeight: 1.6 }}>
              Whether you&apos;re writing your first thesis or managing a research team, LitLens
              adapts to your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: GraduationCap,
                title: "Graduate Students",
                desc: "Writing a thesis or dissertation? Upload your papers and instantly see what your library covers, what it's missing, and how it aligns with your research question.",
                highlight: "Most popular",
              },
              {
                icon: BookOpen,
                title: "Researchers & Academics",
                desc: "Conducting systematic reviews or surveys? Let LitLens organize, cluster, and identify gaps across dozens or hundreds of papers efficiently.",
                highlight: null,
              },
              {
                icon: Building2,
                title: "Research Teams",
                desc: "Collaborating on a literature review? Share a project and let your team query the same library of papers with AI-powered Q&A.",
                highlight: null,
              },
              {
                icon: Lightbulb,
                title: "Independent Learners",
                desc: "Teaching yourself a new field? Upload key papers and ask questions to build understanding faster than reading each paper front to back.",
                highlight: null,
              },
              {
                icon: Search,
                title: "Thesis Advisors",
                desc: "Reviewing student work? Quickly assess whether their literature selection actually covers the topic and identify blind spots.",
                highlight: null,
              },
              {
                icon: Zap,
                title: "Anyone with PDFs",
                desc: "Have a collection of research PDFs? LitLens turns passive file storage into an active, queryable knowledge base.",
                highlight: null,
              },
            ].map((persona) => (
              <div
                key={persona.title}
                className="relative bg-white border border-[#E4E2DC] rounded-xl p-6 hover:shadow-lg hover:border-[#1F5C45]/30 transition-all duration-300 group"
              >
                {persona.highlight && (
                  <div
                    className="absolute -top-3 left-6 px-3 py-1 rounded-full text-white"
                    style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#1F5C45" }}
                  >
                    {persona.highlight}
                  </div>
                )}
                <div className="w-12 h-12 rounded-lg bg-[#EBF2EE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <persona.icon size={22} className="text-[#1F5C45]" />
                </div>
                <h3 className="text-[#1C1C1E] font-semibold mb-2" style={{ fontSize: "17px" }}>{persona.title}</h3>
                <p className="text-[#6B6B78]" style={{ fontSize: "14px", lineHeight: 1.6 }}>{persona.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack / Credibility */}
      <section className="py-12 md:py-16 px-5 md:px-10 bg-[#1C1C1E] text-white">
        <div className="max-w-[800px] mx-auto text-center">
          <p className="text-[#1F5C45] mb-3 font-medium" style={{ fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Built With
          </p>
          <h2 className="mb-8" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(20px, 4vw, 28px)" }}>
            Powered by modern, reliable technology
          </h2>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {[
              "Next.js", "TypeScript", "Prisma", "PostgreSQL",
              "Google Gemini AI", "pgvector", "K-Means Clustering", "FastAPI",
            ].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 rounded-full border border-white/20 text-white/80 hover:border-[#1F5C45] hover:text-[#4ADE80] transition-colors"
                style={{ fontSize: "13px" }}
              >
                {tech}
              </span>
            ))}
          </div>
          <p className="mt-8 text-white/50" style={{ fontSize: "13px" }}>
            University of Nueva Caceres · School of Computer and Information Sciences
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-5 md:px-10">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-[#1C1C1E] mb-4" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(22px, 4vw, 32px)" }}>
            Ready to understand your literature?
          </h2>
          <p className="text-[#6B6B78] mb-8" style={{ fontSize: "15px", lineHeight: 1.6 }}>
            Start a project in under a minute. Upload your PDFs, set your research question, and let LitLens do the rest.
          </p>
          <button
            onClick={() => router.push("/new")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-white transition-all hover:opacity-90 hover:gap-3 cursor-pointer"
            style={{ backgroundColor: "#1F5C45", fontSize: "16px", fontWeight: 600 }}
          >
            Start a New Project
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-[#6B6B78] border-t border-[#E4E2DC]" style={{ fontSize: "12px", letterSpacing: "0.04em" }}>
        LitLens · University of Nueva Caceres, School of Computer and Information Sciences
      </footer>
    </div>
  );
}
