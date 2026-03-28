import { create } from "zustand";

export interface UploadFile {
    file: File;
    id: string;
    status: "pending" | "uploading" | "done" | "error";
    progress: number;
    error?: string;
    documentId?: string;
}

interface UploadState {
    // State
    researchQuestion: string;
    files: UploadFile[];
    projectId: string | null;
    isProcessing: boolean;
    processingStep: number;
    processingMessage: string;

    // Actions
    setResearchQuestion: (q: string) => void;
    addFiles: (newFiles: File[]) => void;
    removeFile: (id: string) => void;
    setProjectId: (id: string) => void;
    updateFileStatus: (
        id: string,
        status: UploadFile["status"],
        extra?: Partial<UploadFile>
    ) => void;
    setProcessing: (
        isProcessing: boolean,
        step?: number,
        message?: string
    ) => void;
    reset: () => void;
}

const initialState = {
    researchQuestion: "",
    files: [],
    projectId: null,
    isProcessing: false,
    processingStep: 0,
    processingMessage: "Reading your library...",
};

export const useUploadStore = create<UploadState>((set, get) => ({
    ...initialState,

    setResearchQuestion: (q) => set({ researchQuestion: q }),

    addFiles: (newFiles) => {
        const existing = get().files;
        const items: UploadFile[] = newFiles.map((f) => ({
            file: f,
            id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            status: "pending",
            progress: 0,
        }));
        set({ files: [...existing, ...items] });
    },

    removeFile: (id) => {
        set({ files: get().files.filter((f) => f.id !== id) });
    },

    setProjectId: (id) => set({ projectId: id }),

    updateFileStatus: (id, status, extra) => {
        set({
            files: get().files.map((f) =>
                f.id === id ? { ...f, status, ...extra } : f
            ),
        });
    },

    setProcessing: (isProcessing, step = 0, message = "Reading your library...") =>
        set({
            isProcessing,
            processingStep: step,
            processingMessage: message,
        }),

    reset: () => set(initialState),
}));
