export function LitLensLogo({ size = "default" }: { size?: "default" | "large" }) {
  const textSize = size === "large" ? "text-[24px]" : "text-[18px]";
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center" style={{ width: size === "large" ? 36 : 28, height: size === "large" ? 36 : 28 }}>
        <svg viewBox="0 0 28 28" fill="none" width="100%" height="100%">
          <rect x="2" y="4" width="16" height="20" rx="2" stroke="#1F5C45" strokeWidth="2" fill="none" />
          <line x1="6" y1="10" x2="14" y2="10" stroke="#1F5C45" strokeWidth="1.5" />
          <line x1="6" y1="14" x2="14" y2="14" stroke="#1F5C45" strokeWidth="1.5" />
          <line x1="6" y1="18" x2="12" y2="18" stroke="#1F5C45" strokeWidth="1.5" />
          <circle cx="20" cy="18" r="6" stroke="#D4821A" strokeWidth="2" fill="none" />
          <line x1="24.5" y1="22.5" x2="27" y2="25" stroke="#D4821A" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <span className={`${textSize} font-semibold tracking-tight`} style={{ fontFamily: "'Playfair Display', serif", color: "#1C1C1E" }}>
        LitLens
      </span>
    </div>
  );
}
