"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/ui/header";
import Stepper from "@/components/ui/stepper";
import Dropzone from "@/components/upload/dropzone";
import FileList from "@/components/upload/file-list";
import ProcessingScreen from "@/components/upload/processing-screen";
import { useUploadStore, UploadFile } from "@/lib/stores/upload-store";
import { useAuth } from "@/components/auth/AuthContext";

const MAX_CHARS = 500;
const MAX_FILES = 20;

export default function NewProjectPage() {
    const router = useRouter();
    const { refreshProjects, setActiveProjectId, isLoggedIn } = useAuth();
    const {
        researchQuestion,
        setResearchQuestion,
        files,
        addFiles,
        removeFile,
        isProcessing,
        processingStep,
        processingMessage,
        setProcessing,
        setProjectId,
        updateFileStatus,
        reset,
    } = useUploadStore();

    const [step, setStep] = useState(1);
    const [error, setError] = useState("");

    // Reset store on mount so returning to /new starts fresh
    useEffect(() => {
        reset();
    }, [reset]);

    const canProceedToStep2 = researchQuestion.trim().length >= 10;
    const canAnalyze = files.length >= 1;

    // Handle adding files
    const handleFilesAdded = useCallback(
        (newFiles: File[]) => {
            addFiles(newFiles);
            setError("");
        },
        [addFiles]
    );

    // Handle removing a file
    const handleRemoveFile = useCallback(
        (id: string) => {
            removeFile(id);
        },
        [removeFile]
    );

    // Step 1 → Step 2
    const handleNextStep = () => {
        if (!canProceedToStep2) {
            setError("Please enter a more specific research question (at least 10 characters).");
            return;
        }
        setError("");
        setStep(2);
    };

    // Handle "Analyze My Library" — create project + upload all PDFs
    const handleAnalyze = async () => {
        if (!canAnalyze) return;

        setProcessing(true, 0, "Creating your project...");

        try {
            // 1. Create the project
            const projectRes = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Research Project",
                    research_question: researchQuestion,
                }),
            });

            if (!projectRes.ok) {
                throw new Error("Failed to create project");
            }

            const project = await projectRes.json();
            setProjectId(project.id);

            // Track anonymous project so it can be claimed after login
            if (!isLoggedIn) {
                try {
                    const stored = JSON.parse(localStorage.getItem("litlens_anon_projects") || "[]");
                    if (!stored.includes(project.id)) {
                        stored.push(project.id);
                        localStorage.setItem("litlens_anon_projects", JSON.stringify(stored));
                    }
                } catch { /* localStorage unavailable */ }
            }

            // 2. Upload PDFs one at a time
            setProcessing(true, 0, "Extracting text from PDFs...");

            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                updateFileStatus(f.id, "uploading");
                setProcessing(
                    true,
                    0,
                    `Processing ${f.file.name} (${i + 1}/${files.length})...`
                );

                try {
                    const formData = new FormData();
                    formData.append("file", f.file);

                    const docRes = await fetch(
                        `/api/projects/${project.id}/documents`,
                        {
                            method: "POST",
                            body: formData,
                        }
                    );

                    if (!docRes.ok) {
                        const errBody = await docRes.json().catch(() => null);
                        throw new Error(
                            errBody?.error?.message || "Upload failed"
                        );
                    }

                    const docData = await docRes.json();
                    updateFileStatus(f.id, "done", { documentId: docData.id });
                } catch (err) {
                    updateFileStatus(f.id, "error", {
                        error: err instanceof Error ? err.message : "Upload failed",
                    });
                }
            }

            // 3. Check if any files succeeded
            const succeededFiles = files.filter(
                (f) => useUploadStore.getState().files.find((sf) => sf.id === f.id)?.status === "done"
            );
            const failedCount = files.length - succeededFiles.length;

            if (succeededFiles.length === 0) {
                // ALL uploads failed — show the actual error message from the first failed file
                const firstFailed = useUploadStore.getState().files.find(f => f.status === "error");
                const actualError = firstFailed?.error || "Unknown error";
                
                setProcessing(false);
                setError(
                    `All ${files.length} file(s) failed to upload. Reason: ${actualError}`
                );
                return;
            }

            if (failedCount > 0) {
                setProcessing(
                    true,
                    1,
                    `${succeededFiles.length} of ${files.length} uploaded. Clustering...`
                );
            } else {
                setProcessing(true, 1, "Clustering your documents...");
            }

            // 4. Trigger orientation analysis
            try {
                const orientRes = await fetch(
                    `/api/projects/${project.id}/orient`,
                    { method: "POST" }
                );

                if (orientRes.ok) {
                    setProcessing(true, 2, "Orientation complete!");
                } else {
                    // Non-fatal — skip orientation, user can trigger manually
                    setProcessing(true, 2, "Preparing your dashboard...");
                }
            } catch {
                // Orientation failed — still navigate, user can re-run
                setProcessing(true, 2, "Preparing your dashboard...");
            }

            // Refresh global auth context to fetch new project
            await refreshProjects();
            setActiveProjectId(project.id);

            // Navigate to project dashboard
            setTimeout(() => {
                router.push(`/project/${project.id}`);
            }, 1200);
        } catch (err) {
            setProcessing(false);
            setError(
                err instanceof Error ? err.message : "Something went wrong. Please try again."
            );
        }
    };

    // Remove early return for ProcessingScreen to prevent DOM unmounting
    // Instead, it will be rendered conditionally below with the rest of the layout hidden.

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            
            <div className={isProcessing ? "hidden" : "block"}>
                <Stepper currentStep={step} steps={["Research Question", "Upload PDFs"]} />
            </div>

            <main className={`flex-1 flex flex-col items-center px-4 pb-12 ${isProcessing ? "hidden" : "flex"}`}>
                <div className="w-full max-w-2xl">
                    {/* ====== STEP 1: Research Question ====== */}
                    {step === 1 && (
                        <div className="animate-fade-in">
                            <h2
                                className="text-2xl font-bold text-charcoal mb-2"
                                style={{ fontFamily: "var(--font-heading)" }}
                            >
                                What is your research question?
                            </h2>
                            <p className="text-sm text-earth mb-6">
                                Be specific. This is the lens LitLens uses to assess your library.
                            </p>

                            <textarea
                                className="input-field"
                                value={researchQuestion}
                                onChange={(e) => {
                                    if (e.target.value.length <= MAX_CHARS) {
                                        setResearchQuestion(e.target.value);
                                        setError("");
                                    }
                                }}
                                placeholder="e.g., What are the barriers to AI adoption in healthcare settings in low-resource countries?"
                                rows={5}
                            />

                            <div className="flex justify-end mt-2 mb-6">
                                <span className="text-xs text-slate">
                                    {researchQuestion.length} / {MAX_CHARS}
                                </span>
                            </div>

                            {error && (
                                <p className="text-sm text-red-muted mb-4">{error}</p>
                            )}

                            <button
                                className="btn-primary w-full py-4 text-base"
                                onClick={handleNextStep}
                                disabled={!canProceedToStep2}
                            >
                                Next: Upload Your PDFs
                            </button>
                        </div>
                    )}

                    {/* ====== STEP 2: Upload PDFs ====== */}
                    {step === 2 && (
                        <div className="animate-fade-in">
                            {/* Back link */}
                            <button
                                onClick={() => setStep(1)}
                                className="flex items-center gap-1.5 text-sm text-slate hover:text-charcoal transition-colors mb-6"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="19" y1="12" x2="5" y2="12" />
                                    <polyline points="12 19 5 12 12 5" />
                                </svg>
                                Back to question
                            </button>

                            {/* Research question display */}
                            <div className="card-flat mb-6">
                                <p className="text-xs font-semibold text-earth uppercase tracking-wider mb-1">
                                    Your Research Question
                                </p>
                                <p className="text-sm text-charcoal italic leading-relaxed">
                                    &ldquo;{researchQuestion}&rdquo;
                                </p>
                            </div>

                            {/* Dropzone */}
                            <div className="mb-6">
                                <Dropzone
                                    onFilesAdded={handleFilesAdded}
                                    maxFiles={MAX_FILES}
                                    currentCount={files.length}
                                />
                            </div>

                            {/* File list */}
                            {files.length > 0 && (
                                <div className="mb-6">
                                    <FileList
                                        files={files}
                                        onRemove={handleRemoveFile}
                                        maxFiles={MAX_FILES}
                                    />
                                </div>
                            )}

                            {error && (
                                <p className="text-sm text-red-muted mb-4">{error}</p>
                            )}

                            {/* Analyze button */}
                            <button
                                className="btn-primary w-full py-4 text-base"
                                onClick={handleAnalyze}
                                disabled={!canAnalyze}
                            >
                                Analyze My Library
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {isProcessing && (
                <main className="flex-1 flex flex-col mt-4">
                    <ProcessingScreen
                        currentStep={processingStep}
                        statusMessage={processingMessage}
                    />
                </main>
            )}

        </div>
    );
}
