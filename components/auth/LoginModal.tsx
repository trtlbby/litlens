"use client";

import { useState } from "react";
import { X, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleLogin = () => {
    if (!email) return;
    login(email);
    setSent(true);
    // Don't close immediately so they can see the confirmation message
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(31, 28, 24, 0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative rounded-2xl w-full max-w-[460px] mx-4 px-10 py-10"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E4E2DC",
          boxShadow: "0 24px 64px rgba(31,28,24,0.14)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: "#6B6B78" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#1C1C1E")}
          onMouseLeave={e => (e.currentTarget.style.color = "#6B6B78")}
        >
          <X size={18} />
        </button>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-[#EBF2EE] rounded-full flex items-center justify-center mx-auto mb-4">
               <Mail className="text-[#1F5C45]" size={28} />
            </div>
            <h2 className="mb-2" style={{ color: "#1C1C1E", fontSize: "22px" }}>Check your inbox</h2>
            <p className="mb-6" style={{ fontSize: "14px", color: "#6B6B78", lineHeight: 1.5 }}>
              We sent a magic login link to <strong>{email}</strong>. Click the link in that email to securely log in.
              <br/><br/>
              {/* <em>(If you are running this locally, check your terminal for the magic link.)</em> */}
            </p>
            <button
               onClick={onClose}
               className="w-full py-3 rounded-lg text-[#1C1C1E] transition-colors"
               style={{ backgroundColor: "#F7F5F0", border: "1px solid #E4E2DC", fontSize: "15px", fontWeight: 500 }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-center mb-1" style={{ color: "#1C1C1E", fontSize: "22px" }}>
              Welcome to LitLens
            </h2>
            <p className="text-center mb-8" style={{ fontSize: "14px", color: "#6B6B78" }}>
              Enter your email to receive a secure login link. No passwords needed.
            </p>

            <div className="mb-6">
              <label className="block mb-1 font-medium" style={{ color: "#1C1C1E", fontSize: "13px" }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-3 rounded-lg outline-none transition-shadow"
                style={{
                  border: "1px solid #E4E2DC",
                  backgroundColor: "#F7F5F0",
                  color: "#1C1C1E",
                }}
                autoFocus
                onFocus={e => (e.currentTarget.style.border = "1px solid #1F5C45")}
                onBlur={e => (e.currentTarget.style.border = "1px solid #E4E2DC")}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={!email}
              className="w-full py-3 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#1F5C45", fontSize: "15px", fontWeight: 500 }}
            >
              Send Magic Link
            </button>
          </>
        )}
      </div>
    </div>
  );
}
