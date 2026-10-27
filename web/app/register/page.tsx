"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [agreedNews, setAgreedNews] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthLabel = password ? strengthLabels[Math.min(strengthScore, 3)] : "Weak";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTerms) {
      setError("Please accept the Terms of Service to proceed.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username || name || "Alex")}`;
      await register(name, email, password, avatarUrl);
      router.push("/chat");
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please check your details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface font-sans text-on-surface min-h-screen flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden">
      {/* Ambient Depth Backgrounds */}
      <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-primary-fixed blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-secondary-fixed blur-3xl opacity-50 pointer-events-none" />

      {/* Main Register Container Card */}
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl p-8 sm:p-10 flex flex-col gap-6 border border-outline-variant/30">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shadow-md mb-4">
            <span className="material-symbols-outlined text-[28px]">forum</span>
          </div>
          <span className="text-xs text-primary uppercase tracking-widest font-semibold mb-1">
            Chatly Auth
          </span>
          <h1 className="text-2xl text-on-surface font-bold tracking-tight">Create your account</h1>
          <p className="text-xs text-on-surface-variant mt-1.5 max-w-xs">
            Join over 250k people communicating effortlessly.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Social Auth Providers */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              setName("Google User");
              setEmail("google.user@example.com");
              setUsername("googleuser");
              setPassword("password123");
            }}
            className="group w-full py-2.5 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-all duration-150 flex items-center justify-center gap-3 text-sm font-medium"
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

          <button
            type="button"
            onClick={() => {
              setName("Apple User");
              setEmail("apple.user@example.com");
              setUsername("appleuser");
              setPassword("password123");
            }}
            className="w-full py-2.5 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-all duration-150 flex items-center justify-center gap-3 text-sm font-medium"
          >
            <svg className="w-4 h-4 fill-current text-on-surface" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.77 1.05-1.84.93-2.92-.91.04-2.02.61-2.67 1.37-.58.68-1.09 1.77-.95 2.82 1.01.08 2.06-.5 2.69-1.27z" />
            </svg>
            <span>Continue with Apple</span>
          </button>
        </div>

        <div className="relative flex items-center justify-center my-0.5">
          <div className="w-full h-px bg-surface-container-high" />
          <span className="absolute px-3 bg-surface-container-lowest text-[11px] uppercase tracking-wider text-outline font-semibold">
            or sign up with email
          </span>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface" htmlFor="name-input">
              Full Name
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                person
              </span>
              <input
                id="name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline-variant text-sm shadow-xs outline-none focus:ring-2 focus:ring-primary-container transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface" htmlFor="email-input">
              Work Email
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                mail
              </span>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline-variant text-sm shadow-xs outline-none focus:ring-2 focus:ring-primary-container transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface" htmlFor="username-input">
                Username
              </label>
              {username.length >= 3 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-tertiary-container font-semibold bg-tertiary-fixed px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  Available
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                alternate_email
              </span>
              <input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                placeholder="alexmorgan"
                className="w-full pl-9 pr-8 py-2.5 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline-variant text-sm shadow-xs outline-none focus:ring-2 focus:ring-primary-container transition-all"
              />
              {username.length >= 3 && (
                <span className="material-symbols-outlined absolute right-3 text-tertiary-container text-[18px]">
                  check
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface" htmlFor="password-input">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                lock
              </span>
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline-variant text-sm shadow-xs outline-none focus:ring-2 focus:ring-primary-container transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 text-outline hover:text-on-surface flex items-center justify-center p-1 rounded transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            {/* Password Strength Indicator */}
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-on-surface-variant">Password Strength</span>
                <span
                  className={`text-[11px] font-semibold ${
                    strengthScore >= 3
                      ? "text-tertiary-container"
                      : strengthScore >= 2
                      ? "text-secondary"
                      : "text-red-500"
                  }`}
                >
                  {strengthLabel}
                </span>
              </div>
              <div className="flex gap-1.5 h-1.5 w-full">
                <div
                  className={`h-full flex-1 rounded-full transition-colors ${
                    strengthScore >= 1 ? "bg-tertiary-container" : "bg-surface-container"
                  }`}
                />
                <div
                  className={`h-full flex-1 rounded-full transition-colors ${
                    strengthScore >= 2 ? "bg-tertiary-container" : "bg-surface-container"
                  }`}
                />
                <div
                  className={`h-full flex-1 rounded-full transition-colors ${
                    strengthScore >= 3 ? "bg-tertiary-container" : "bg-surface-container"
                  }`}
                />
                <div
                  className={`h-full flex-1 rounded-full transition-colors ${
                    strengthScore >= 4 ? "bg-tertiary-container" : "bg-surface-container"
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1 text-xs text-on-surface-variant">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-primary-container h-4 w-4 accent-primary"
              />
              <span className="leading-snug">
                I agree to the <span className="text-primary font-medium hover:underline">Terms of Service</span> & <span className="text-primary font-medium hover:underline">Privacy Policy</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedNews}
                onChange={(e) => setAgreedNews(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-primary-container h-4 w-4 accent-primary"
              />
              <span className="leading-snug">
                Send me occasional product tips, new features, and security alerts
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-lg bg-primary-container hover:bg-primary active:scale-[0.99] text-on-primary font-semibold text-sm shadow-md transition-all duration-200 mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{isSubmitting ? "Creating Chatly Account..." : "Create Chatly Account"}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        <div className="flex flex-col items-center gap-4 pt-1">
          <p className="text-xs text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline ml-1">
              Sign in
            </Link>
          </p>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-tertiary-container">
              verified_user
            </span>
            <span>End-to-end 256-bit encrypted data protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
}
