"use client";

import Link from "next/link";
import Header from "@/components/ui/header";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-8">
        {/* Decorative elements */}
        <div className="flex items-center gap-6 mb-10">
          <div className="w-12 h-[2px] bg-forest/30" />
          <div className="flex gap-3">
            <div
              className="w-8 h-10 rounded-sm bg-cream-dark border border-black/8 rotate-[-8deg] shadow-sm"
              style={{ transform: "rotate(-8deg)" }}
            />
            <div
              className="w-8 h-10 rounded-sm bg-cream-dark border border-black/8 shadow-sm"
            />
            <div
              className="w-8 h-10 rounded-sm bg-cream-dark border border-black/8 rotate-[8deg] shadow-sm"
              style={{ transform: "rotate(8deg)" }}
            />
          </div>
          <div className="w-12 h-[2px] bg-forest/30" />
        </div>

        {/* Headline */}
        <h1
          className="text-5xl md:text-6xl font-bold text-charcoal text-center leading-[1.15] mb-5 max-w-2xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Understand your literature.
          <br />
          Not just collect it.
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate text-center max-w-xl mb-10 leading-relaxed">
          Upload your research question and PDFs — get thematic clusters,
          alignment assessment, cited Q&A, and gap analysis in seconds.
        </p>

        {/* CTA Button */}
        <Link href="/new">
          <button className="btn-primary text-base px-10 py-4 rounded-full shadow-lg hover:shadow-xl">
            Start a New Project
          </button>
        </Link>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-20 max-w-3xl w-full px-4">
          {[
            {
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l2 2" />
                </svg>
              ),
              title: "Orientation View",
              desc: "See how your library aligns with your research question at a glance.",
            },
            {
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              ),
              title: "Q&A with Citations",
              desc: "Ask questions and get answers grounded in your actual documents.",
            },
            {
              icon: (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              ),
              title: "Gap Detection",
              desc: "Discover what's missing from your literature before your committee does.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="card flex flex-col items-center text-center px-6 py-8"
            >
              <div className="w-12 h-12 rounded-xl bg-cream-dark flex items-center justify-center mb-4 text-forest">
                {card.icon}
              </div>
              <h3
                className="text-base font-bold text-charcoal mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {card.title}
              </h3>
              <p className="text-sm text-slate leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-slate">
          LitLens · Built for researchers, by researchers
        </p>
      </footer>
    </div>
  );
}
