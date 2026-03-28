"use client";

import Link from "next/link";

export default function Header() {
    return (
        <header className="w-full px-8 py-5 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 no-underline">
                <div className="w-8 h-8 rounded-lg bg-forest flex items-center justify-center">
                    <svg
                        width="18"
                        height="18"
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
                    className="text-xl font-semibold text-charcoal tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                >
                    LitLens
                </span>
            </Link>
        </header>
    );
}
