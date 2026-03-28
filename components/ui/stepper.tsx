"use client";

interface StepperProps {
    currentStep: number;
    steps: string[];
}

export default function Stepper({ currentStep, steps }: StepperProps) {
    return (
        <div className="flex items-center justify-center gap-3 py-6">
            {steps.map((label, index) => {
                const stepNum = index + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;

                return (
                    <div key={label} className="flex items-center gap-3">
                        {/* Step indicator */}
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${isCompleted
                                        ? "bg-forest text-white"
                                        : isActive
                                            ? "bg-forest text-white"
                                            : "bg-cream-dark text-slate border border-slate/30"
                                    }`}
                            >
                                {isCompleted ? (
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    stepNum
                                )}
                            </div>
                            <span
                                className={`text-sm font-medium transition-colors ${isActive || isCompleted ? "text-charcoal" : "text-slate"
                                    }`}
                            >
                                {label}
                            </span>
                        </div>

                        {/* Connector line (not after last step) */}
                        {index < steps.length - 1 && (
                            <div
                                className={`w-16 h-[2px] transition-colors ${isCompleted ? "bg-forest" : "bg-slate/20"
                                    }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
