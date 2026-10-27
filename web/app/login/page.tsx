"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/chat");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <div className="bg-surface font-sans text-on-surface min-h-screen flex flex-col justify-center items-center relative overflow-hidden">
      {/* Decorative Ambient Background Blobs */}
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-primary-fixed-dim/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-36 -right-24 w-[30rem] h-[30rem] rounded-full bg-secondary-fixed/30 blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-8 z-10 px-6">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-md shadow-primary-container/20 transition-transform duration-200 group-hover:scale-105">
            <span className="material-symbols-outlined text-2xl font-bold">forum</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-on-surface">Chatly</span>
        </Link>
        <div className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-container" />
          </span>
          <span className="text-xs text-on-surface-variant font-medium">
            Chatly Network: <span className="text-tertiary-container font-semibold">Operational</span>
          </span>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[460px] bg-surface-container-lowest rounded-2xl shadow-xl shadow-primary-container/5 relative z-10 p-8 sm:p-10 border border-outline-variant/30">
        <div className="flex flex-col mb-6">
          <div className="inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded bg-surface-container-high text-primary text-xs uppercase tracking-wider font-semibold mb-2">
            Enterprise Gateway
          </div>
          <h1 className="text-2xl text-on-surface font-bold tracking-tight mb-1">
            Welcome back to Chatly
          </h1>
          <p className="text-sm text-on-surface-variant">
            Enter your credentials to access your conversations
          </p>
        </div>

        {/* Demo Fast Login Pills */}
        <div className="mb-6 p-3 rounded-xl bg-surface-container-low/70 border border-outline-variant/20">
          <p className="text-xs text-on-surface-variant mb-2 font-medium">Test accounts (password: password123):</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin("alice@example.com")}
              className="text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary-container text-on-surface transition-colors shadow-xs"
            >
              Alice Johnson
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("bob@example.com")}
              className="text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary-container text-on-surface transition-colors shadow-xs"
            >
              Bob Smith
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("charlie@example.com")}
              className="text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary-container text-on-surface transition-colors shadow-xs"
            >
              Charlie Brown
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-on-surface" htmlFor="email">
              Email or Username
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-lg pointer-events-none">mail</span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@example.com"
                className="w-full pl-10 pr-3 py-2.5 bg-surface-container-low text-on-surface placeholder:text-outline text-sm rounded-lg focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-on-surface" htmlFor="password">
                Password
              </label>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-lg pointer-events-none">lock</span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-surface-container-low text-on-surface placeholder:text-outline text-sm rounded-lg focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="material-symbols-outlined absolute right-3 text-outline hover:text-on-surface text-lg cursor-pointer"
              >
                {showPassword ? "visibility_off" : "visibility"}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-primary-container hover:bg-primary text-on-primary text-sm font-semibold rounded-lg shadow-md shadow-primary-container/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <span>{isSubmitting ? "Signing in..." : "Sign In to Workspace"}</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 text-center border-t border-outline-variant/30">
          <p className="text-xs text-on-surface-variant">
            New to Chatly?{" "}
            <Link href="/register" className="text-primary-container font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Footer Links */}
      <div className="w-full max-w-sm mt-6 flex justify-center items-center gap-4 text-outline text-xs">
        <span>Privacy Policy</span>
        <span className="w-1 h-1 rounded-full bg-outline-variant" />
        <span>Terms of Service</span>
        <span className="w-1 h-1 rounded-full bg-outline-variant" />
        <span>Help Center</span>
      </div>
    </div>
  );
}
