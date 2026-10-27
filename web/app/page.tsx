"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function WelcomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [showDemoModal, setShowDemoModal] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/chat");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="bg-surface font-sans text-on-surface min-h-screen flex flex-col">
      {/* ─────────────────────────────────────────────────────────────
          TOP NAVBAR
      ───────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-md shadow-primary-container/20">
              <span className="material-symbols-outlined text-xl font-bold">forum</span>
            </div>
            <span className="text-xl font-bold text-primary tracking-tight">Chatly</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-on-surface hover:text-primary font-medium transition-colors">
              Features
            </a>
            <a href="#solutions" className="text-on-surface hover:text-primary font-medium transition-colors">
              Solutions
            </a>
            <a href="#security" className="text-on-surface hover:text-primary font-medium transition-colors">
              Security
            </a>
            <a href="#pricing" className="text-on-surface-variant hover:text-on-surface transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-primary-container text-on-primary text-xs font-semibold rounded-lg shadow-sm hover:bg-primary transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          HERO SECTION
      ───────────────────────────────────────────────────────────── */}
      <main className="w-full pt-16 bg-surface">
        <section className="relative w-full overflow-hidden px-6 lg:px-12 pt-12 lg:pt-16 pb-16">
          {/* Ambient Glow Backdrops */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary-fixed blur-3xl opacity-40 pointer-events-none rounded-full" />
          <div className="absolute top-48 right-10 w-[360px] h-[360px] bg-secondary-fixed blur-3xl opacity-30 pointer-events-none rounded-full" />

          <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high text-primary text-xs font-semibold mb-6 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
              <span>Chatly v3.4 is live</span>
              <span className="text-outline mx-1">•</span>
              <span className="text-on-surface-variant font-normal">Next-Gen Real-Time Engine</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[46px] font-extrabold text-on-surface tracking-tight max-w-4xl leading-tight mb-5">
              Real-time messaging built for{" "}
              <span className="text-primary underline decoration-primary-fixed-dim decoration-wavy underline-offset-8">
                focus
              </span>{" "}
              and momentum
            </h1>

            {/* Subheading */}
            <p className="text-base text-on-surface-variant max-w-2xl mb-8 leading-relaxed">
              Experience sub-50ms velocity, zero-knowledge end-to-end encryption, and a whisper-quiet interface engineered to keep distributed teams perfectly in sync.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mb-10">
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-container text-on-primary text-sm font-semibold shadow-md hover:bg-primary transition-all flex items-center justify-center gap-2 group"
              >
                <span>Start Chatting for Free</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-container-lowest text-on-surface text-sm font-semibold shadow-xs hover:bg-surface-container transition-all flex items-center justify-center gap-2 border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">play_circle</span>
                <span>Watch 1-min Demo</span>
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-2">
              <div className="flex -space-x-2">
                {["Alex", "Elena", "Marcus", "Sarah"].map((seed) => (
                  <img
                    key={seed}
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                    alt={seed}
                    className="w-8 h-8 rounded-full object-cover shadow-sm ring-2 ring-surface"
                  />
                ))}
                <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] flex items-center justify-center shadow-sm font-bold">
                  +250k
                </div>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1 text-tertiary-container">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-[16px]">star</span>
                  ))}
                  <span className="text-xs font-bold text-on-surface ml-1">4.9 / 5.0</span>
                </div>
                <p className="text-xs text-on-surface-variant">Over 250,000 teams rely on Chatly daily</p>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              DESKTOP APP PREVIEW MOCKUP WINDOW
          ───────────────────────────────────────────────────────────── */}
          <div className="max-w-5xl mx-auto mt-12 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-fixed to-secondary-fixed opacity-40 blur-2xl rounded-3xl -z-10" />
            <div className="w-full bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col md:flex-row h-[520px]">
              {/* Sidebar Preview */}
              <div className="w-full md:w-72 bg-surface-container-low flex flex-col justify-between shrink-0 p-3 border-r border-outline-variant/30">
                <div>
                  <div className="flex items-center justify-between px-3 py-2 bg-surface-container rounded-xl mb-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-xs">
                        NL
                      </div>
                      <span className="text-xs font-bold text-on-surface truncate">Nova Labs Global</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                      unfold_more
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest shadow-xs mb-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">search</span>
                    <span className="text-xs text-outline">Search (⌘ + K)</span>
                  </div>

                  <div className="space-y-1">
                    <div className="px-2 py-1 text-outline text-[10px] uppercase font-bold tracking-wider">
                      Active Channels
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-bold">#</span>
                        <span>core-launch-alpha</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-container text-on-surface-variant text-xs cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-outline">#</span>
                        <span>design-critique</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                        4
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-surface-container rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
                    <span className="text-[11px] text-on-surface-variant">Sync state: 0 lag</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">lock</span>
                </div>
              </div>

              {/* Chat Canvas Preview */}
              <div className="flex-1 bg-surface-container-lowest flex flex-col justify-between overflow-hidden">
                <div className="h-14 px-5 bg-surface-container-low flex items-center justify-between shrink-0 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-on-surface"># core-launch-alpha</span>
                    <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-semibold">
                      E2EE Locked
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">call</span>
                    <span className="material-symbols-outlined text-[18px]">videocam</span>
                    <span className="material-symbols-outlined text-[18px]">push_pin</span>
                  </div>
                </div>

                {/* Message Stack Preview */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  <div className="flex items-start gap-3">
                    <img
                      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Elena"
                      alt="Elena"
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 shadow-xs"
                    />
                    <div className="flex flex-col items-start max-w-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-on-surface">Elena Rostova</span>
                        <span className="text-[10px] text-outline">12:38 PM</span>
                      </div>
                      <div className="bg-surface-container-low rounded-2xl rounded-tl-sm p-3.5 text-on-surface text-xs leading-relaxed shadow-xs">
                        Just pushed the sub-50ms WebSocket routing patches. All canary environments report zero packet drop across Frankfurt & Singapore hubs! 🚀
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs flex items-center gap-1">
                          <span>🔥</span>
                          <span className="font-bold">6</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary text-xs flex items-center gap-1">
                          <span>⚡</span>
                          <span className="font-bold">3</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-end gap-3">
                    <div className="flex flex-col items-end max-w-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-outline">12:40 PM</span>
                        <span className="text-xs font-bold text-primary">You</span>
                      </div>
                      <div className="bg-primary-container text-on-primary rounded-2xl rounded-tr-sm p-3.5 text-xs shadow-md">
                        Incredible pace! Running the telemetry validation now. Latency metrics look razor sharp.
                      </div>
                      <span className="text-[10px] text-primary flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[13px]">done_all</span>
                        <span>Delivered & read</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Composer Mockup */}
                <div className="p-3 bg-surface-container-low border-t border-outline-variant/30">
                  <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-2 rounded-xl shadow-xs">
                    <span className="material-symbols-outlined text-[18px] text-outline">add_circle</span>
                    <input
                      readOnly
                      value="Ready to stage rollout to production clusters! ✨"
                      className="flex-1 bg-transparent text-xs text-on-surface focus:outline-none"
                    />
                    <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-sm">send</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            INTERACTIVE STATS BANNER
        ───────────────────────────────────────────────────────────── */}
        <section className="w-full bg-surface-container py-12 px-6 lg:px-12 my-8 border-y border-outline-variant/20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-[28px]">verified</span>
                <span className="text-3xl font-black text-on-surface tracking-tight">99.99%</span>
              </div>
              <p className="text-sm font-semibold text-on-surface">Guaranteed Uptime</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                Multi-region distributed mesh with automatic peer-to-peer failover fallback.
              </p>
            </div>

            <div className="flex flex-col items-center p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-tertiary-container text-[28px]">speed</span>
                <span className="text-3xl font-black text-on-surface tracking-tight">&lt;50ms</span>
              </div>
              <p className="text-sm font-semibold text-on-surface">Global Latency</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                WebSocket stream routing powered by 84 worldwide edge distribution centers.
              </p>
            </div>

            <div className="flex flex-col items-center p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-secondary text-[28px]">security</span>
                <span className="text-3xl font-black text-on-surface tracking-tight">Zero</span>
              </div>
              <p className="text-sm font-semibold text-on-surface">Ads or Data Selling</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                Pure SaaS subscription architecture. Your conversations are mathematically private.
              </p>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3 BENTO FEATURE CARDS
        ───────────────────────────────────────────────────────────── */}
        <section id="features" className="max-w-6xl mx-auto px-6 lg:px-12 py-16 w-full">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary text-xs font-semibold mb-3">
              <span>Engineered for Velocity</span>
            </div>
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">
              Why high-performing teams switch to Chatly
            </h2>
            <p className="text-sm text-on-surface-variant mt-3">
              Built from the ground up for uncompromised responsiveness, clarity of thought, and rock-solid privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-surface-container-low rounded-2xl p-8 flex flex-col justify-between shadow-xs border border-outline-variant/30">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary mb-6">
                  <span className="material-symbols-outlined text-[26px]">bolt</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-3">Lightning Instant Sync</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                  Sub-50ms message latency, intelligent offline-first local caching, and seamless background state reconciliation.
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-lowest p-4 space-y-2 text-xs">
                <div className="flex justify-between text-outline">
                  <span>Sync delta</span>
                  <span className="font-bold text-tertiary-container">38ms (Peak)</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="bg-primary-container h-full w-11/12 rounded-full" />
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-8 flex flex-col justify-between shadow-xs border border-outline-variant/30">
              <div>
                <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary mb-6">
                  <span className="material-symbols-outlined text-[26px]">forum</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-3">Effortless Collaboration</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                  Smart contextual threads, variable-speed voice memos, rich link unfurling, and syntax-highlighted code snippets.
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-lowest p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-secondary text-sm">alt_route</span>
                    Thread • 8 replies
                  </span>
                  <span className="text-outline text-[10px]">Active now</span>
                </div>
                <p className="text-[11px] text-on-surface-variant bg-surface-container-high p-2 rounded-lg truncate">
                  “Confirmed: GraphQL schema migration scheduled for 02:00 UTC”
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-8 flex flex-col justify-between shadow-xs border border-outline-variant/30">
              <div>
                <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed mb-6">
                  <span className="material-symbols-outlined text-[26px]">lock</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-3">Enterprise-grade Privacy</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                  Default zero-knowledge end-to-end encryption, automated biometrics lock on inactivity, and fine-grained role access.
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-lowest p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
                  <span className="font-bold text-on-surface">Double Ratchet Protocol</span>
                </div>
                <div className="flex gap-2 pt-1 text-[10px] text-outline">
                  <span className="px-2 py-0.5 rounded bg-surface-container">SOC2 Type II</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container">GDPR Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            TESTIMONIAL SECTION
        ───────────────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 lg:px-12 py-10 w-full">
          <div className="bg-surface-container rounded-2xl p-8 lg:p-12 relative overflow-hidden shadow-xs border border-outline-variant/30">
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-2xl">
                <div className="flex items-center gap-1 text-tertiary-container mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-[20px]">star</span>
                  ))}
                </div>
                <blockquote className="text-xl font-medium text-on-surface leading-snug mb-6">
                  “Chatly replaced three disjointed messaging apps for our 180-person engineering department. The sub-50ms latency makes remote work feel like everyone is in the same physical room.”
                </blockquote>
                <div className="flex items-center gap-4">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
                    alt="Sarah Jenkins"
                    className="w-12 h-12 rounded-full object-cover shadow-xs ring-2 ring-surface"
                  />
                  <div>
                    <div className="text-sm font-bold text-on-surface">Sarah Jenkins</div>
                    <div className="text-xs text-on-surface-variant">VP of Engineering at HyperCloud Systems</div>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-80 bg-surface-container-lowest rounded-xl p-6 shadow-xs shrink-0 space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Team Momentum Index</span>
                  <span className="text-tertiary-container font-bold">+41%</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-outline">
                    <span>Context Switching</span>
                    <span className="text-on-surface font-semibold">-64% reduction</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div className="bg-tertiary-container h-full w-3/4 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            FINAL CALL TO ACTION BANNER
        ───────────────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 lg:px-12 py-16 w-full">
          <div className="bg-surface-container-highest rounded-2xl p-10 lg:p-14 text-center relative overflow-hidden shadow-xs border border-outline-variant/30">
            <div className="max-w-3xl mx-auto relative z-10">
              <h2 className="text-3xl font-black text-on-surface tracking-tight mb-4">
                Ready to supercharge how your team communicates?
              </h2>
              <p className="text-sm text-on-surface-variant mb-8 max-w-xl mx-auto leading-relaxed">
                Set up your workspace in under 30 seconds. No credit card required. Free tier includes unlimited history for teams up to 15.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary-container text-on-primary text-sm font-semibold shadow-md hover:bg-primary transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                  <span>Open Chatly Web App</span>
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-surface-container-lowest text-on-surface text-sm font-semibold shadow-xs hover:bg-surface-container transition-all flex items-center justify-center gap-2 border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span>Sign In to Existing Workspace</span>
                </Link>
              </div>

              {/* Platform Badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-outline">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">desktop_mac</span> macOS
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">desktop_windows</span> Windows 11 / 10
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">terminal</span> Linux (.deb & .rpm)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">phone_iphone</span> iOS & Android
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative border border-outline-variant/30">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
              <h3 className="text-base font-bold text-on-surface">Chatly 1-Minute Walkthrough</h3>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <div className="py-8 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">play_arrow</span>
              </div>
              <p className="text-sm text-on-surface font-semibold">
                Explore the live working workspace directly!
              </p>
              <Link
                href="/login"
                className="px-6 py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-semibold shadow-md hover:bg-primary transition-all"
              >
                Launch Workspace Demo
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 px-12 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between text-xs text-outline">
        <div>© 2026 Chatly Messaging App. Powered by Stitch Design System.</div>
        <div className="flex gap-4 mt-2 sm:mt-0">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Security</span>
        </div>
      </footer>
    </div>
  );
}
