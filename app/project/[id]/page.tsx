"use client";

import { useState, useEffect, use } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/buttons";

/* ─── Types ─── */
interface ClusterData {
  id: string;
  cluster_index: number;
  label: string;
  summary: string;
  doc_count: number;
  doc_names: string[];
}

interface OrientationData {
  research_question: string | null;
  alignment_score: number | null;
  library_summary: string | null;
  strong_coverage: string[];
  notable_gaps: string[];
  doc_count: number;
  clusters: ClusterData[];
}

/* ─── Cluster colors (cycle through) ─── */
const CLUSTER_COLORS = [
  "#4A7C59",
  "#3D6B9A",
  "#8C5E7A",
  "#B5614A",
  "#8A7D3E",
  "#5B7D8E",
  "#7A5D3E",
  "#5E7A5D",
];

/* ─── Orientation Page ─── */
export default function OrientationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [data, setData] = useState<OrientationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orienting, setOrienting] = useState(false);
  const [error, setError] = useState("");

  const fetchOrientation = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/orient`);
      if (!res.ok) throw new Error("Failed to load orientation");
      const json = await res.json();
      setData(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const runOrientation = async () => {
    try {
      setOrienting(true);
      setError("");
      const res = await fetch(`/api/projects/${projectId}/orient`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || "Orientation failed");
      }
      // Refetch to get the full data with IDs
      await fetchOrientation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Orientation failed");
    } finally {
      setOrienting(false);
    }
  };

  useEffect(() => {
    fetchOrientation();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1F5C45] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#6B6B78]">Loading orientation...</p>
        </div>
      </div>
    );
  }

  // No orientation data yet — show CTA to run it
  if (!data || data.clusters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-[#EBF2EE] flex items-center justify-center mb-6">
          <RefreshCw size={24} className="text-[#1F5C45]" />
        </div>
        <h3
          className="text-[#1C1C1E] mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Run Orientation Analysis
        </h3>
        <p
          className="text-[#6B6B78] mb-6 text-center max-w-[400px]"
          style={{ fontSize: "14px", lineHeight: 1.5 }}
        >
          Cluster your documents, score alignment with your research question,
          and generate a library summary.
        </p>
        {error && (
          <p className="text-[#C0392B] text-sm mb-4">{error}</p>
        )}
        <Button onClick={runOrientation} disabled={orienting}>
          {orienting ? "Analyzing..." : "Analyze My Library"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Re-run button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={runOrientation}
          disabled={orienting}
          className="text-sm"
        >
          <RefreshCw size={14} className={orienting ? "animate-spin" : ""} />
          {orienting ? "Re-analyzing..." : "Re-analyze"}
        </Button>
      </div>

      {/* Zone A — Library Snapshot */}
      <div className="bg-white border border-[#E4E2DC] rounded-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Research Question */}
          <div className="flex-1">
            <p
              className="text-[#6B6B78] mb-2"
              style={{
                fontSize: "12px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Your Research Question
            </p>
            {data.research_question ? (
              <blockquote className="border-l-3 border-[#1F5C45] pl-4 py-2 bg-[#F0EDE6] rounded-r-md">
                <p
                  className="text-[#1C1C1E] italic"
                  style={{ fontSize: "15px", lineHeight: 1.6 }}
                >
                  &ldquo;{data.research_question}&rdquo;
                </p>
              </blockquote>
            ) : (
              <p className="text-[#6B6B78] italic" style={{ fontSize: "14px" }}>
                No research question set.
              </p>
            )}

            {data.strong_coverage.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-[#6B6B78]" style={{ fontSize: "12px" }}>
                  Strong coverage in:
                </span>
                {data.strong_coverage.map((label) => (
                  <Chip key={label} label={label} color="#4A7C59" />
                ))}
              </div>
            )}
            {data.notable_gaps.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[#6B6B78]" style={{ fontSize: "12px" }}>
                  Notable gaps:
                </span>
                {data.notable_gaps.map((label) => (
                  <Chip key={label} label={label} color="#D4821A" />
                ))}
              </div>
            )}
          </div>

          {/* Alignment Score */}
          {data.alignment_score !== null && (
            <div className="flex flex-col items-center justify-center min-w-[160px]">
              <AlignmentScore score={data.alignment_score} />
            </div>
          )}
        </div>
      </div>

      {/* Zone B — Thematic Clusters */}
      <div>
        <h2 className="mb-4" style={{ fontFamily: "var(--font-heading)" }}>
          What your library covers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.clusters.map((cluster, i) => (
            <ClusterCard
              key={cluster.id || i}
              cluster={cluster}
              color={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
            />
          ))}
        </div>
      </div>

      {/* Zone C — Library Summary */}
      {data.library_summary && (
        <div className="bg-white border border-[#E4E2DC] rounded-lg p-6 md:p-8">
          <h2 className="mb-4" style={{ fontFamily: "var(--font-heading)" }}>
            Plain-English Summary
          </h2>
          <p
            className="text-[#1C1C1E] max-w-[680px]"
            style={{ fontSize: "15px", lineHeight: 1.6 }}
          >
            {data.library_summary}
          </p>
          <div className="mt-6 pt-4 border-t border-[#E4E2DC]">
            <p className="text-[#6B6B78]" style={{ fontSize: "12px" }}>
              Based on {data.doc_count} documents ·{" "}
              {data.clusters.length} clusters detected
            </p>
          </div>
        </div>
      )}

      {/* Warning for small libraries */}
      {data.doc_count < 5 && (
        <div className="bg-[#FDF6E9] border border-[#D4821A]/30 rounded-lg p-4 flex items-start gap-3">
          <span className="text-[#D4821A] mt-0.5" style={{ fontSize: "18px" }}>
            ⚠
          </span>
          <p
            className="text-[#1C1C1E]"
            style={{ fontSize: "14px", lineHeight: 1.5 }}
          >
            For reliable cluster analysis, we recommend uploading at least 5
            documents. Your library currently has {data.doc_count} — more
            documents will improve accuracy.
          </p>
        </div>
      )}

      {error && (
        <p className="text-[#C0392B] text-sm text-center">{error}</p>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function AlignmentScore({ score }: { score: number }) {
  const color =
    score >= 70 ? "#1F5C45" : score >= 40 ? "#D4821A" : "#C0392B";
  const circumference = 2 * Math.PI * 52;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative w-[132px] h-[132px]">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle
          cx="66"
          cy="66"
          r="52"
          fill="none"
          stroke="#E4E2DC"
          strokeWidth="8"
        />
        <circle
          cx="66"
          cy="66"
          r="52"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          strokeLinecap="round"
          transform="rotate(-90 66 66)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color,
            fontFamily: "var(--font-body)",
          }}
        >
          {score}
        </span>
        <span
          className="text-[#6B6B78]"
          style={{ fontSize: "11px", letterSpacing: "0.04em" }}
        >
          ALIGNMENT
        </span>
      </div>
    </div>
  );
}

function ClusterCard({
  cluster,
  color,
}: {
  cluster: ClusterData;
  color: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-[#E4E2DC] rounded-lg overflow-hidden">
      <div className="flex">
        <div
          className="w-1 flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <div className="p-5 flex-1">
          <h3
            className="mb-1"
            style={{
              fontSize: "16px",
              fontFamily: "var(--font-heading)",
            }}
          >
            {cluster.label}
          </h3>
          <p className="text-[#6B6B78] mb-2" style={{ fontSize: "13px" }}>
            {cluster.doc_count} document{cluster.doc_count !== 1 ? "s" : ""}
          </p>
          <p
            className="text-[#6B6B78]"
            style={{ fontSize: "14px", lineHeight: 1.5 }}
          >
            {cluster.summary}
          </p>
          {cluster.doc_names.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[#1F5C45] mt-3 cursor-pointer hover:underline transition-colors"
                style={{ fontSize: "13px" }}
              >
                {expanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                {expanded ? "Hide documents" : "Show documents"}
              </button>
              {expanded && (
                <ul className="mt-2 space-y-1">
                  {cluster.doc_names.map((doc) => (
                    <li
                      key={doc}
                      className="text-[#6B6B78] pl-5"
                      style={{ fontSize: "13px" }}
                    >
                      {doc}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded"
      style={{
        fontSize: "12px",
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  );
}
