"use client";
import CreateRoomButton from "@/components/homepage/CreateRoomButton";
import Footer from "@/components/homepage/Footer";
import Features from "@/components/homepage/Features";
import { useState, useEffect } from "react";

export default function Home() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="relative min-h-screen text-white overflow-hidden flex flex-col bg-[#0a0a0a]">
      {/* Subtle grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Refined gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 via-transparent to-neutral-900/30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-white/[0.03] to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-8 md:px-16 lg:px-24 py-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="/interviewlablogo.svg"
              alt="InterviewLab Logo"
              className="h-9 w-9 brightness-0 invert opacity-90"
            />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-white/90">
            InterviewLab
          </span>
        </div>

        <div className="flex items-center">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
            <span className="font-body text-sm text-white/50 tracking-wide">
              4,249 labs created
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 z-10 relative flex items-center justify-center px-8 md:px-16 lg:px-24 py-12">
        <div className="relative flex flex-col gap-10 items-center justify-center text-center max-w-4xl mx-auto">
          {/* Main headline */}
          <div
            className={`transform transition-all duration-700 ${
              showContent
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95]">
              <span className="block text-white">Practice smarter.</span>
              <span className="block text-white/40 mt-2">Interview better.</span>
            </h1>
          </div>

          {/* Subheadline */}
          <p
            className={`font-body text-lg md:text-xl text-white/35 max-w-xl leading-relaxed tracking-wide transform transition-all duration-700 delay-150 ${
              showContent
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            Real-time code execution, AI-powered feedback, and live collaboration.
            All in your browser.
          </p>

          {/* CTA */}
          <div
            className={`mt-4 transform transition-all duration-700 delay-300 ${
              showContent ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <CreateRoomButton />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <div className="w-full z-10 relative">
        <Features />
      </div>

      {/* Footer */}
      <div className="w-full z-10 relative mt-auto">
        <Footer />
      </div>
    </div>
  );
}
