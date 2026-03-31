"use client";

import { useAuth } from "./AuthContext";
import { LoginModal } from "./LoginModal";
import { Lock } from "lucide-react";
import { useState } from "react";

interface AuthGateProps {
  children: React.ReactNode;
  featureName: string;
}

export function AuthGate({ children, featureName }: AuthGateProps) {
  const { isLoggedIn } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (isLoggedIn) return <>{children}</>;

  return (
    <div className="relative min-h-[400px]">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.35 }}>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="text-center px-8 py-10 rounded-xl max-w-[420px] mx-4"
          style={{
            backgroundColor: "white",
            border: "1px solid #E4E2DC",
            boxShadow: "0 12px 40px rgba(31,28,24,0.1)",
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "#EBF2EE" }}
          >
            <Lock size={24} className="text-[#1F5C45]" />
          </div>
          <h3 className="mb-2" style={{ fontSize: "18px", color: "#1C1C1E" }}>
            Sign in to access {featureName}
          </h3>
          <p className="mb-6" style={{ fontSize: "14px", color: "#6B6B78", lineHeight: 1.6 }}>
            Create a free account to unlock {featureName}, save your projects, and get the full LitLens experience.
          </p>
          <button
            onClick={() => setShowLogin(true)}
            className="px-6 py-3 rounded-lg text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: "#1F5C45", fontSize: "15px" }}
          >
            Log in or Sign up
          </button>
        </div>
      </div>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
