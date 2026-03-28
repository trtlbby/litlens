"use client";

export function LitLensLogo({ size = "default" }: { size?: "default" | "small" }) {
  const iconSize = size === "small" ? 28 : 32;
  const textSize = size === "small" ? "text-lg" : "text-xl";

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-lg bg-[#1F5C45] flex items-center justify-center"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          width={iconSize * 0.56}
          height={iconSize * 0.56}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          <path d="M8 7h6" />
          <path d="M8 11h8" />
        </svg>
      </div>
      <span
        className={`${textSize} font-semibold text-[#1C1C1E] tracking-tight`}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        LitLens
      </span>
    </div>
  );
}
