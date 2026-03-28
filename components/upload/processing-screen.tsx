"use client";

import { useEffect, useState } from "react";

interface ProcessingStep {
    label: string;
    description: string;
}

const PROCESSING_STEPS: ProcessingStep[] = [
    {
        label: "Extracting text from PDFs",
        description: "Reading and parsing your documents",
    },
    {
        label: "Generating semantic embeddings",
        description: "Creating vector representations for search",
    },
    {
        label: "Discovering thematic clusters",
        description: "Grouping related concepts across papers",
    },
    {
        label: "Analyzing alignment with your research question",
        description: "Assessing relevance and coverage",
    },
];

interface ProcessingScreenProps {
    currentStep?: number;
    statusMessage?: string;
}

export default function ProcessingScreen({
    currentStep = 0,
    statusMessage = "Reading your library...",
}: ProcessingScreenProps) {
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-12">
                <div className="w-9 h-9 rounded-lg bg-forest flex items-center justify-center">
                    <svg
                        width="20"
                        height="20"
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
                    className="text-2xl font-semibold text-charcoal tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                >
                    LitLens
                </span>
            </div>

            {/* Steps */}
            <div className="w-full max-w-md space-y-6 mb-12">
                {PROCESSING_STEPS.map((step, index) => {
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;
                    const isPending = index > currentStep;

                    return (
                        <div
                            key={step.label}
                            className={`flex items-start gap-4 transition-all duration-500 ${isPending ? "opacity-40" : "opacity-100"
                                }`}
                        >
                            {/* Status indicator */}
                            <div className="flex-shrink-0 mt-0.5">
                                {isCompleted ? (
                                    <div className="w-6 h-6 rounded-full bg-forest flex items-center justify-center">
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                ) : isActive ? (
                                    <div className="w-6 h-6 rounded-full border-2 border-forest flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-forest animate-pulse-dot" />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full border-2 border-slate/30 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-slate/30" />
                                    </div>
                                )}
                            </div>

                            {/* Label */}
                            <div>
                                <p
                                    className={`text-sm font-medium ${isActive
                                            ? "text-forest"
                                            : isCompleted
                                                ? "text-charcoal"
                                                : "text-slate"
                                        }`}
                                >
                                    {isActive ? "✦ " : "✦ "}
                                    {step.label}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Status message */}
            <p className="text-sm font-medium text-earth">
                {statusMessage}
                {dots}
            </p>
        </div>
    );
}
