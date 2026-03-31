"use client";

import { useState, useEffect, use } from "react";
import { Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";

/* ─── Types ─── */
interface Gap {
  id: string;
  title: string;
  priority: "high" | "medium";
  description: string;
  searchTerms: string[];
  addressed: boolean;
}

interface CoverageItem {
  label: string;
  covered: number;
}

type FilterType = "all" | "high" | "medium" | "addressed";

/* ─── Gaps Page ─── */
export default function GapsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // Load gaps on mount
  useEffect(() => {
    const loadGaps = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/gaps`);
        if (res.ok) {
          const data = await res.json();
          setGaps(data.gaps || []);
          setCoverage(data.coverage || []);
        }
      } catch {
        // non-critical
      }
      setLoading(false);
    };
    loadGaps();
  }, [projectId]);

  // Run gap analysis
  const runAnalysis = async () => {
    setAnalyzing(true);
    setError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/gaps`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error?.message || "Gap analysis failed."
        );
      }

      const data = await res.json();
      setGaps(data.gaps || []);

      // Refresh coverage data
      const coverageRes = await fetch(
        `/api/projects/${projectId}/gaps`
      );
      if (coverageRes.ok) {
        const coverageData = await coverageRes.json();
        setCoverage(coverageData.coverage || []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Analysis failed."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Toggle addressed
  const toggleAddressed = async (id: string) => {
    // Optimistic update
    setGaps((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, addressed: !g.addressed } : g
      )
    );

    try {
      const res = await fetch(
        `/api/projects/${projectId}/gaps/${id}`,
        { method: "PATCH" }
      );

      if (!res.ok) {
        // Revert on failure
        setGaps((prev) =>
          prev.map((g) =>
            g.id === id ? { ...g, addressed: !g.addressed } : g
          )
        );
      }
    } catch {
      // Revert
      setGaps((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, addressed: !g.addressed } : g
        )
      );
    }
  };

  const filteredGaps = gaps
    .filter((g) => {
      if (filter === "all") return true;
      if (filter === "addressed") return g.addressed;
      if (filter === "high")
        return g.priority === "high" && !g.addressed;
      if (filter === "medium")
        return g.priority === "medium" && !g.addressed;
      return true;
    })
    .sort((a, b) => {
      if (a.addressed !== b.addressed) return a.addressed ? 1 : -1;
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (b.priority === "high" && a.priority !== "high") return 1;
      return 0;
    });

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "high", label: "High Priority" },
    { key: "medium", label: "Medium Priority" },
    { key: "addressed", label: "Addressed" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#1F5C45] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthGate featureName="Gap Detection">
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2
            style={{ fontFamily: "var(--font-heading)" }}
            className="mb-2"
          >
            Research Gaps
          </h2>
          <p
            className="text-[#6B6B78]"
            style={{ fontSize: "15px", lineHeight: 1.5 }}
          >
            Topics relevant to your research question that are
            underrepresented in your library.
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1F5C45] text-white hover:bg-[#174D39] disabled:opacity-50 transition-colors cursor-pointer flex-shrink-0"
          style={{ fontSize: "14px" }}
        >
          {analyzing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {gaps.length === 0
            ? "Run Gap Analysis"
            : "Re-analyze"}
        </button>
      </div>

      {error && (
        <div className="bg-[#C0392B]/10 border border-[#C0392B]/20 rounded-lg p-4">
          <p className="text-[#C0392B]" style={{ fontSize: "14px" }}>
            {error}
          </p>
        </div>
      )}

      {analyzing && (
        <div className="bg-white border border-[#E4E2DC] rounded-lg p-8 flex flex-col items-center gap-4">
          <Loader2
            size={32}
            className="animate-spin text-[#1F5C45]"
          />
          <p className="text-[#6B6B78]" style={{ fontSize: "15px" }}>
            Analyzing your library for research gaps…
          </p>
        </div>
      )}

      {!analyzing && gaps.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-[#E4E2DC] rounded-lg p-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#FFF3E0] flex items-center justify-center mb-6">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                fill="#D4821A"
              />
            </svg>
          </div>
          <h3
            className="text-[#1C1C1E] mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            No gaps detected yet
          </h3>
          <p
            className="text-[#6B6B78] mb-6 text-center max-w-[400px]"
            style={{ fontSize: "14px", lineHeight: 1.5 }}
          >
            Run the gap analysis to identify topics that are
            underrepresented in your library relative to your
            research question.
          </p>
        </div>
      ) : (
        !analyzing && (
          <>
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-2 rounded-full border transition-colors cursor-pointer ${
                    filter === f.key
                      ? "bg-[#1F5C45] text-white border-[#1F5C45]"
                      : "bg-white text-[#6B6B78] border-[#E4E2DC] hover:border-[#1F5C45] hover:text-[#1C1C1E]"
                  }`}
                  style={{ fontSize: "13px" }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Gap Cards */}
            <div className="space-y-4">
              {filteredGaps.map((gap) => (
                <GapCard
                  key={gap.id}
                  gap={gap}
                  onToggle={toggleAddressed}
                />
              ))}
              {filteredGaps.length === 0 && (
                <p
                  className="text-[#6B6B78] text-center py-8"
                  style={{ fontSize: "14px" }}
                >
                  No gaps match this filter.
                </p>
              )}
            </div>

            {/* Coverage Bar Chart */}
            {coverage.length > 0 && (
              <div className="bg-white border border-[#E4E2DC] rounded-lg p-6 md:p-8">
                <h3
                  className="mb-6"
                  style={{
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  Your coverage vs. your question
                </h3>
                <div className="space-y-4">
                  {coverage.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-4"
                    >
                      <span
                        className="w-[200px] flex-shrink-0 text-right text-[#6B6B78] truncate"
                        style={{ fontSize: "13px" }}
                        title={item.label}
                      >
                        {item.label}
                      </span>
                      <div className="flex-1 h-6 bg-[#F0EDE6] rounded overflow-hidden flex">
                        <div
                          className="h-full rounded-l transition-all duration-500"
                          style={{
                            width: `${item.covered}%`,
                            backgroundColor:
                              item.covered >= 50
                                ? "#1F5C45"
                                : item.covered >= 30
                                ? "#D4821A"
                                : "#C0392B",
                          }}
                        />
                      </div>
                      <span
                        className="w-10 text-[#6B6B78]"
                        style={{ fontSize: "13px" }}
                      >
                        {item.covered}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
    </AuthGate>
  );
}

/* ─── Sub-components ─── */

function GapCard({
  gap,
  onToggle,
}: {
  gap: Gap;
  onToggle: (id: string) => void;
}) {
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);

  const barColor = gap.addressed
    ? "#1F5C45"
    : gap.priority === "high"
    ? "#C0392B"
    : "#D4821A";

  const copyTerm = (term: string) => {
    navigator.clipboard.writeText(term).catch(() => {});
    setCopiedTerm(term);
    setTimeout(() => setCopiedTerm(null), 1500);
  };

  return (
    <div
      className={`bg-white border border-[#E4E2DC] rounded-lg overflow-hidden flex ${
        gap.addressed ? "opacity-60" : ""
      }`}
    >
      <div
        className="w-1 flex-shrink-0"
        style={{ backgroundColor: barColor }}
      />
      <div className="flex-1 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3
                style={{
                  fontSize: "16px",
                  fontFamily: "var(--font-heading)",
                }}
                className={gap.addressed ? "line-through" : ""}
              >
                {gap.title}
              </h3>
              <span
                className="px-2 py-0.5 rounded text-white flex-shrink-0"
                style={{
                  fontSize: "11px",
                  backgroundColor: barColor,
                }}
              >
                {gap.addressed
                  ? "Addressed"
                  : gap.priority === "high"
                  ? "High"
                  : "Medium"}
              </span>
            </div>
            <p
              className="text-[#6B6B78] mb-3"
              style={{
                fontSize: "14px",
                lineHeight: 1.5,
                maxWidth: "680px",
              }}
            >
              {gap.description}
            </p>
            {gap.searchTerms.length > 0 && (
              <div>
                <span
                  className="text-[#6B6B78]"
                  style={{
                    fontSize: "12px",
                    letterSpacing: "0.04em",
                  }}
                >
                  Suggested search terms:
                </span>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {gap.searchTerms.map((term) => (
                    <button
                      key={term}
                      onClick={() => copyTerm(term)}
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#D4821A]/30 bg-[#D4821A]/10 text-[#D4821A] hover:bg-[#D4821A]/20 transition-colors cursor-pointer"
                      style={{ fontSize: "12px" }}
                      title="Click to copy"
                    >
                      {term}
                      {copiedTerm === term ? (
                        <Check size={12} />
                      ) : (
                        <Copy
                          size={12}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Toggle */}
          <button
            onClick={() => onToggle(gap.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-md border transition-colors cursor-pointer ${
              gap.addressed
                ? "bg-[#EBF2EE] border-[#1F5C45] text-[#1F5C45]"
                : "bg-white border-[#E4E2DC] text-[#6B6B78] hover:border-[#1F5C45] hover:text-[#1F5C45]"
            }`}
            style={{ fontSize: "13px" }}
          >
            {gap.addressed ? "✓ Addressed" : "Mark as Addressed"}
          </button>
        </div>
      </div>
    </div>
  );
}
