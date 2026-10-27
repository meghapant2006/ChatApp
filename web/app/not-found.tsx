import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-surface font-sans text-on-surface min-h-screen flex flex-col justify-center items-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center z-10 max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-4xl">search_off</span>
        </div>

        <h1 className="text-6xl font-extrabold text-primary mb-2">404</h1>
        <h2 className="text-xl font-bold text-on-surface mb-2">Conversation or Page Not Found</h2>
        <p className="text-sm text-on-surface-variant mb-6">
          The channel, message link, or page you are looking for has either been moved, deleted, or does not exist.
        </p>

        <Link
          href="/chat"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-container text-sm font-semibold shadow-md hover:bg-primary transition-all"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          <span>Return to Chatly</span>
        </Link>
      </div>
    </div>
  );
}
