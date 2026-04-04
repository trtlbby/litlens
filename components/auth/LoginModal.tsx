"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff, FolderOpen } from "lucide-react";
import { useAuth } from "./AuthContext";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputStyle = {
  border: "1px solid #E4E2DC",
  backgroundColor: "#F7F5F0",
  color: "#1C1C1E",
};

const focusStyle = "1px solid #1F5C45";
const blurStyle = "1px solid #E4E2DC";

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, register, refreshProjects } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [institution, setInstitution] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [postAuth, setPostAuth] = useState<"checking" | "no-projects" | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
    setBio("");
    setInstitution("");
    setError("");
    setShowPassword(false);
  };

  const switchMode = (newMode: "signin" | "signup") => {
    setMode(newMode);
    resetForm();
  };

  const handlePostAuthRedirect = async () => {
    setPostAuth("checking");
    try {
      await refreshProjects();
      const res = await fetch("/api/projects", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        resetForm();
        onClose();
        router.push(`/project/${data[0].id}`);
      } else {
        setPostAuth("no-projects");
      }
    } catch {
      setPostAuth("no-projects");
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    setError("");
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      await handlePostAuthRedirect();
    } else {
      setError(res.error || "Sign in failed");
    }
  };

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !password) {
      setError("First name, last name, email, and password are required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    const res = await register({
      firstName,
      lastName,
      email,
      password,
      bio: bio || undefined,
      institution: institution || undefined,
    });
    setLoading(false);
    if (res.ok) {
      await handlePostAuthRedirect();
    } else {
      setError(res.error || "Registration failed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (mode === "signin") handleSignIn();
      else handleSignUp();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(31, 28, 24, 0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !postAuth) onClose();
      }}
    >
      <div
        className="relative rounded-2xl w-full max-w-[460px] mx-4 px-10 py-10 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E4E2DC",
          boxShadow: "0 24px 64px rgba(31,28,24,0.14)",
        }}
      >
        {!postAuth && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 transition-colors"
            style={{ color: "#6B6B78" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1C1C1E")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B78")}
          >
            <X size={18} />
          </button>
        )}

        {postAuth === "checking" && (
          <div className="flex flex-col items-center justify-center py-16">
            <div
              className="w-8 h-8 border-[3px] rounded-full animate-spin mb-4"
              style={{ borderColor: "#E4E2DC", borderTopColor: "#1F5C45" }}
            />
            <p style={{ color: "#6B6B78", fontSize: "14px" }}>Checking your projects...</p>
          </div>
        )}

        {postAuth === "no-projects" && (
          <div className="flex flex-col items-center justify-center py-10">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "#F7F5F0" }}
            >
              <FolderOpen size={24} style={{ color: "#1F5C45" }} />
            </div>
            <h2 className="text-center mb-1" style={{ color: "#1C1C1E", fontSize: "20px", fontWeight: 600 }}>
              No projects yet
            </h2>
            <p className="text-center mb-6" style={{ fontSize: "14px", color: "#6B6B78" }}>
              You don&apos;t have any projects. Create one to get started!
            </p>
            <button
              onClick={() => {
                resetForm();
                setPostAuth(null);
                onClose();
                router.push("/new");
              }}
              className="w-full py-3 rounded-lg text-white transition-opacity hover:opacity-90 mb-3"
              style={{ backgroundColor: "#1F5C45", fontSize: "15px", fontWeight: 500 }}
            >
              Create Your First Project
            </button>
            <button
              onClick={() => {
                resetForm();
                setPostAuth(null);
                onClose();
              }}
              className="w-full py-3 rounded-lg transition-colors"
              style={{ color: "#6B6B78", fontSize: "14px" }}
            >
              Stay on this page
            </button>
          </div>
        )}

        {!postAuth && (
          <>
        <h2 className="text-center mb-1" style={{ color: "#1C1C1E", fontSize: "22px" }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-center mb-6" style={{ fontSize: "14px", color: "#6B6B78" }}>
          {mode === "signin"
            ? "Sign in to access your projects"
            : "Join LitLens to save your research"}
        </p>

        {/* Mode toggle */}
        <div
          className="flex rounded-lg mb-6 p-1"
          style={{ backgroundColor: "#F7F5F0", border: "1px solid #E4E2DC" }}
        >
          <button
            onClick={() => switchMode("signin")}
            className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: mode === "signin" ? "#FFFFFF" : "transparent",
              color: mode === "signin" ? "#1C1C1E" : "#6B6B78",
              boxShadow: mode === "signin" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode("signup")}
            className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: mode === "signup" ? "#FFFFFF" : "transparent",
              color: mode === "signup" ? "#1C1C1E" : "#6B6B78",
              boxShadow: mode === "signup" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            Sign Up
          </button>
        </div>

        {mode === "signup" && (
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block mb-1 font-medium" style={{ color: "#1C1C1E", fontSize: "13px" }}>
                First name
              </label>
              <input
                type="text"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 rounded-lg outline-none transition-shadow"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.border = focusStyle)}
                onBlur={(e) => (e.currentTarget.style.border = blurStyle)}
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 font-medium" style={{ color: "#1C1C1E", fontSize: "13px" }}>
                Last name
              </label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 rounded-lg outline-none transition-shadow"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.border = focusStyle)}
                onBlur={(e) => (e.currentTarget.style.border = blurStyle)}
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="block mb-1 font-medium" style={{ color: "#1C1C1E", fontSize: "13px" }}>
            Email address
          </label>
          <input
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-3 rounded-lg outline-none transition-shadow"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.border = focusStyle)}
            onBlur={(e) => (e.currentTarget.style.border = blurStyle)}
          />
        </div>

        {/* Password with toggle */}
        <div className="mb-4">
          <label className="block mb-1 font-medium" style={{ color: "#1C1C1E", fontSize: "13px" }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={mode === "signin" ? "Enter your password" : "At least 8 characters"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 pr-11 rounded-lg outline-none transition-shadow"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.border = focusStyle)}
              onBlur={(e) => (e.currentTarget.style.border = blurStyle)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "#6B6B78" }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {mode === "signup" && (
          <>
            {/* Confirm password */}
            <div className="mb-4">
              <label className="block mb-1 font-medium" style={{ color: "#1C1C1E", fontSize: "13px" }}>
                Confirm password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 rounded-lg outline-none transition-shadow"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.border = focusStyle)}
                onBlur={(e) => (e.currentTarget.style.border = blurStyle)}
              />
            </div>

            <div className="pt-2 mb-4" style={{ borderTop: "1px solid #E4E2DC" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "#6B6B78" }}>Optional</p>

              {/* Institution */}
              <div className="mb-4">
                <label className="block mb-1 font-medium" style={{ color: "#1C1C1E", fontSize: "13px" }}>
                  Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g., University of the Philippines"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-3 rounded-lg outline-none transition-shadow"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.border = focusStyle)}
                  onBlur={(e) => (e.currentTarget.style.border = blurStyle)}
                />
              </div>

              {/* Bio */}
              <div className="mb-4">
                <label className="block mb-1 font-medium" style={{ color: "#1C1C1E", fontSize: "13px" }}>
                  Bio
                </label>
                <input
                  type="text"
                  placeholder="Brief description of your research interests"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-3 rounded-lg outline-none transition-shadow"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.border = focusStyle)}
                  onBlur={(e) => (e.currentTarget.style.border = blurStyle)}
                />
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="text-sm mb-4" style={{ color: "#C0392B" }}>{error}</p>
        )}

        <button
          onClick={mode === "signin" ? handleSignIn : handleSignUp}
          disabled={loading}
          className="w-full py-3 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#1F5C45", fontSize: "15px", fontWeight: 500 }}
        >
          {loading
            ? mode === "signin" ? "Signing in..." : "Creating account..."
            : mode === "signin" ? "Sign In" : "Create Account"}
        </button>
          </>
        )}
      </div>
    </div>
  );
}
