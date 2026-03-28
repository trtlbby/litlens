"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  children: ReactNode;
}

const variants: Record<string, string> = {
  primary:
    "bg-[#1F5C45] text-white hover:bg-[#174D39] border border-[#1F5C45]",
  secondary:
    "bg-white text-[#1C1C1E] hover:bg-[#F0EDE6] border border-[#E4E2DC]",
  ghost:
    "bg-transparent text-[#1F5C45] hover:bg-[#EBF2EE] border border-transparent",
  destructive:
    "bg-[#C0392B] text-white hover:bg-[#A93226] border border-[#C0392B]",
};

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
