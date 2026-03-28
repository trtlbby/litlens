"use client";

interface UploadFile {
    file: File;
    id: string;
}

interface FileListProps {
    files: UploadFile[];
    onRemove: (id: string) => void;
    maxFiles?: number;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function FileList({
    files,
    onRemove,
    maxFiles = 20,
}: FileListProps) {
    return (
        <div className="space-y-2">
            <p className="text-sm text-slate font-medium mb-3">
                {files.length} / {maxFiles} files added
            </p>

            {files.map((f, index) => (
                <div
                    key={f.id}
                    className="card-flat flex items-center justify-between animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
                >
                    <div className="flex items-center gap-3">
                        {/* PDF icon */}
                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center border border-black/5">
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-earth"
                            >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-charcoal leading-tight">
                                {f.file.name}
                            </p>
                            <p className="text-xs text-slate mt-0.5">
                                {formatFileSize(f.file.size)}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(f.id);
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-slate hover:text-red-muted hover:bg-red-muted/10 transition-colors"
                        aria-label={`Remove ${f.file.name}`}
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
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}
