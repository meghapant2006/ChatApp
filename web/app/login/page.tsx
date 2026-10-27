"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { initiateGoogleLogin } from "@/lib/google-auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingGoogle, setIsVerifyingGoogle] = useState(false);

  // Check for Google OAuth callback parameters
  const code = searchParams.get("code");
  const authError = searchParams.get("error");
  const tokenParam = searchParams.get("token");

  useEffect(() => {
    if (authError) {
      setError(`Google sign-in error: ${authError}`);
      return;
    }

    if (tokenParam) {
      setIsVerifyingGoogle(true);
      localStorage.setItem("chatly_token", tokenParam);
      window.location.href = "/chat";
      return;
    }

    if (code) {
      setIsVerifyingGoogle(true);
      setError(null);
      loginWithGoogle({
        code,
        redirectUri: `${window.location.origin}/login`,
      })
        .then(() => {
          router.push("/chat");
        })
        .catch((err: any) => {
          setError(err.message || "Failed to authenticate with Google. Please check your credentials.");
          setIsVerifyingGoogle(false);
        });
    }
  }, [code, authError, loginWithGoogle, router]);

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

  const handleGoogleClick = () => {
    setError(null);
    try {
      initiateGoogleLogin();
    } catch (err: any) {
      setError(err.message || "Could not launch Google authentication.");
    }
  };

  return (
    <div className="bg-surface font-sans text-on-surface min-h-screen flex flex-col justify-center items-center relative overflow-hidden py-8 px-4">
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
            Enter your credentials or use Google Single Sign-On
          </p>
        </div>

        {isVerifyingGoogle && (
          <div className="mb-6 p-4 rounded-xl bg-primary-container/10 border border-primary-container/30 text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-primary">Verifying Google authentication...</p>
            <p className="text-xs text-on-surface-variant">Setting up your secure workspace session</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={isVerifyingGoogle || isSubmitting}
          className="w-full py-2.5 px-4 mb-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-all duration-150 flex items-center justify-center gap-3 text-sm font-medium border border-outline-variant/30 active:scale-[0.99] disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-outline-variant/30" />
          <span className="flex-shrink mx-3 text-xs uppercase tracking-wider text-outline">or email</span>
          <div className="flex-grow border-t border-outline-variant/30" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-on-surface" htmlFor="email">
              Email Address
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
              disabled={isSubmitting || isVerifyingGoogle}
              className="w-full py-2.5 px-4 bg-primary-container hover:bg-primary text-on-primary text-sm font-semibold rounded-lg shadow-md shadow-primary-container/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <span>{isSubmitting ? "Signing in..." : "Sign In to Workspace"}</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </form>

        {/* Demo Fast Login Pills */}
        <div className="mt-5 p-3 rounded-xl bg-surface-container-low/70 border border-outline-variant/20">
          <p className="text-xs text-on-surface-variant mb-2 font-medium">Quick Demo Accounts (password: password123):</p>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center text-sm text-outline">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
