"use client";

import { useCallback, useState, DragEvent, useRef } from "react";

interface DropzoneProps {
    onFilesAdded: (files: File[]) => void;
    maxFiles?: number;
    currentCount?: number;
}

export default function Dropzone({
    onFilesAdded,
    maxFiles = 20,
    currentCount = 0,
}: DropzoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const remaining = maxFiles - currentCount;

    const handleFiles = useCallback(
        (fileList: FileList | null) => {
            if (!fileList) return;
            const pdfFiles = Array.from(fileList).filter(
                (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
            );
            if (pdfFiles.length > 0) {
                const allowed = pdfFiles.slice(0, remaining);
                onFilesAdded(allowed);
            }
        },
        [onFilesAdded, remaining]
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles]
    );

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            className={`dropzone ${isDragOver ? "drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleClick()}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
            />

            {/* Upload icon */}
            <div className="flex justify-center mb-4">
                <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
            </div>

            <p className="text-base font-semibold text-charcoal mb-1">
                Drag and drop your PDFs here
            </p>
            <p className="text-sm text-slate">
                or click to browse · PDF only · Max {maxFiles} files
            </p>
        </div>
    );
}
