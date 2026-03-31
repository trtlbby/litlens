"use client";

import { useState, useEffect, useRef, use } from "react";
import { ArrowUp, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";

/* ─── Types ─── */
interface Source {
  id: string;
  passage: string;
  document_filename: string;
  document_title: string | null;
  relevance_score: number;
  relevance: string;
}

interface QAExchange {
  id: string;
  question: string;
  answer: string;
  sources: Source[];
}

/* ─── Ask Page ─── */
export default function AskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [query, setQuery] = useState("");
  const [exchanges, setExchanges] = useState<QAExchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load past Q&A sessions on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/ask`);
        if (res.ok) {
          const data = await res.json();
          setExchanges(data.sessions || []);
        }
      } catch {
        // silently skip — not critical
      }
      setHistoryLoaded(true);
    };
    loadHistory();
  }, [projectId]);

  // Auto-scroll on new exchange
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [exchanges, loading]);

  const handleSubmit = async (questionText?: string) => {
    const q = (questionText || query).trim();
    if (!q || loading) return;

    setQuery("");
    setError("");
    setLoading(true);

    // Optimistic: show the question immediately
    const tempId = `pending-${Date.now()}`;
    setExchanges((prev) => [
      ...prev,
      { id: tempId, question: q, answer: "", sources: [] },
    ]);

    try {
      const res = await fetch(`/api/projects/${projectId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || "Failed to get answer.");
      }

      const data = await res.json();

      // Replace the pending exchange with the real one
      setExchanges((prev) =>
        prev.map((ex) =>
          ex.id === tempId
            ? {
                id: data.id,
                question: data.question,
                answer: data.answer,
                sources: data.sources,
              }
            : ex
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      // Remove the pending exchange
      setExchanges((prev) => prev.filter((ex) => ex.id !== tempId));
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "What are the main findings across my documents?",
    "What methodologies are used in my library?",
    "Where do my sources agree or disagree?",
  ];

  return (
    <AuthGate featureName="Ask Your Library">
      <div className="flex flex-col h-[calc(100vh-72px)]">
        {/* Sticky Query Bar */}
        <div className="sticky top-0 z-10 bg-[#F7F5F0] pb-4">
          <div className="flex items-center gap-2 bg-white border border-[#E4E2DC] rounded-lg overflow-hidden">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Ask anything about your literature…"
              disabled={loading}
              className="flex-1 h-[56px] px-5 bg-transparent focus:outline-none disabled:opacity-50"
              style={{ fontSize: "15px" }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!query.trim() || loading}
              className="w-[48px] h-[48px] mr-1 rounded-md bg-[#1F5C45] text-white flex items-center justify-center cursor-pointer hover:bg-[#174D39] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <ArrowUp size={20} />
              )}
            </button>
          </div>
          {error && (
            <p className="text-[#C0392B] text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          {!historyLoaded ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#1F5C45] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : exchanges.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-[#EBF2EE] flex items-center justify-center mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z"
                    fill="#1F5C45"
                  />
                </svg>
              </div>
              <h3
                className="text-[#1C1C1E] mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Ask your library anything
              </h3>
              <p
                className="text-[#6B6B78] mb-6 text-center max-w-[400px]"
                style={{ fontSize: "14px", lineHeight: 1.5 }}
              >
                Get answers grounded in your uploaded documents, with cited
                passages you can verify.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSubmit(q)}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-full border border-[#E4E2DC] bg-white text-[#1C1C1E] hover:border-[#1F5C45] hover:bg-[#EBF2EE] transition-colors cursor-pointer disabled:opacity-50"
                    style={{ fontSize: "13px" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Q&A Exchanges */
            <div className="space-y-6 pb-8">
              {exchanges.map((exchange) => (
                <ExchangeBlock key={exchange.id} exchange={exchange} />
              ))}
              {loading && (
                <div className="flex items-center gap-3 text-[#6B6B78] pl-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ fontSize: "14px" }}>
                    Searching your library and composing an answer…
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}

/* ─── Sub-components ─── */

function ExchangeBlock({ exchange }: { exchange: QAExchange }) {
  const [showAllCitations, setShowAllCitations] = useState(false);

  // Only show top sources (relevance > threshold) or first 3
  const topSources = exchange.sources.filter(
    (s) => s.relevance === "High" || s.relevance === "Medium"
  );
  const displaySources = topSources.length > 0 ? topSources : exchange.sources.slice(0, 3);
  const visibleSources = showAllCitations
    ? displaySources
    : displaySources.slice(0, 2);

  // Pending state (no answer yet)
  if (!exchange.answer) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="bg-[#EBF2EE] px-5 py-3 rounded-lg max-w-[600px]">
            <p
              className="text-[#1C1C1E]"
              style={{ fontSize: "15px", lineHeight: 1.5 }}
            >
              {exchange.question}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Question */}
      <div className="flex justify-end">
        <div className="bg-[#EBF2EE] px-5 py-3 rounded-lg max-w-[600px]">
          <p
            className="text-[#1C1C1E]"
            style={{ fontSize: "15px", lineHeight: 1.5 }}
          >
            {exchange.question}
          </p>
        </div>
      </div>

      {/* Answer */}
      <div className="bg-white border border-[#E4E2DC] rounded-lg p-6 max-w-[720px]">
        <p
          className="text-[#1C1C1E] mb-5 whitespace-pre-line"
          style={{
            fontSize: "15px",
            lineHeight: 1.6,
            maxWidth: "680px",
          }}
        >
          {exchange.answer}
        </p>

        {displaySources.length > 0 && (
          <div className="border-t border-[#E4E2DC] pt-4">
            <p
              className="text-[#6B6B78] mb-3"
              style={{
                fontSize: "12px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Based on {displaySources.length} source passage{displaySources.length !== 1 ? "s" : ""}:
            </p>

            <div className="space-y-3">
              {visibleSources.map((source) => (
                <CitationBlock key={source.id} source={source} />
              ))}
            </div>

            {displaySources.length > 2 && (
              <button
                onClick={() => setShowAllCitations(!showAllCitations)}
                className="flex items-center gap-1 text-[#1F5C45] mt-3 cursor-pointer hover:underline"
                style={{ fontSize: "13px" }}
              >
                {showAllCitations ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {showAllCitations
                  ? "Show fewer"
                  : `Show ${displaySources.length - 2} more`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CitationBlock({ source }: { source: Source }) {
  const relevanceColor =
    source.relevance === "High"
      ? "#1F5C45"
      : source.relevance === "Medium"
      ? "#D4821A"
      : "#6B6B78";

  // Truncate long passages for display
  const displayText =
    source.passage.length > 300
      ? source.passage.slice(0, 300) + "…"
      : source.passage;

  return (
    <div className="bg-[#F0EDE6] rounded-md p-4">
      <p
        className="text-[#1C1C1E] italic mb-3"
        style={{ fontSize: "13px", lineHeight: 1.6, fontFamily: "'DM Mono', monospace" }}
      >
        &ldquo;{displayText}&rdquo;
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[#6B6B78]" style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>
          {source.document_title || source.document_filename}
        </span>
        <span
          className="px-2 py-0.5 rounded text-white"
          style={{ fontSize: "11px", backgroundColor: relevanceColor }}
        >
          {source.relevance}
        </span>
      </div>
    </div>
  );
}
