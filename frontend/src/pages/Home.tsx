"use client";
import CreateRoomButton from "@/components/homepage/CreateRoomButton";
import Footer from "@/components/homepage/Footer";
import Features from "@/components/homepage/Features";
import Collaborate from "@/components/homepage/Collaborate";
import BrowserFrame from "@/components/homepage/BrowserFrame";
import heroImg from "@/assets/QuestionBoardExample.png";
import { motion } from "framer-motion";

const easeCurve = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-white text-neutral-900 flex flex-col">
      {/* Header */}
      <header className="relative z-10 px-8 py-6 rise-in">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <img
              src="/interviewlablogo.svg"
              alt="InterviewLab Logo"
              className="h-7 w-7 brightness-0 opacity-90"
            />
            <span className="font-display text-lg font-bold tracking-tight text-neutral-900">
              InterviewLab
            </span>
          </div>
          <span className="hidden md:block font-body text-sm text-neutral-500 px-3.5 py-1.5 rounded-lg bg-neutral-100">
            4,249 labs created
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 z-10 relative px-8 md:px-16 lg:px-24 pt-14 md:pt-20 pb-8">
        <div className="flex flex-col gap-6 items-center text-center max-w-3xl mx-auto">
          <h1
            className="rise-in font-display text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02] text-neutral-900"
            style={{ animationDelay: "120ms" }}
          >
            Practice smarter. Interview better.
          </h1>

          <p
            className="rise-in font-body text-lg md:text-xl text-neutral-500 max-w-xl leading-relaxed"
            style={{ animationDelay: "220ms" }}
          >
            Real-time code execution, AI-powered feedback, and live
            collaboration. All in your browser.
          </p>

          <div className="rise-in mt-2" style={{ animationDelay: "320ms" }}>
            <CreateRoomButton />
          </div>
        </div>

        {/* Product shot */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: easeCurve }}
          viewport={{ once: true, margin: "-60px" }}
          className="relative max-w-5xl mx-auto mt-14 md:mt-20"
        >
          <BrowserFrame src={heroImg} alt="InterviewLab coding room" />
        </motion.div>
      </main>

      {/* Collaboration */}
      <div className="w-full z-10 relative">
        <Collaborate />
      </div>

      {/* Features */}
      <div id="features" className="w-full z-10 relative">
        <Features />
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: easeCurve }}
        viewport={{ once: true }}
        className="w-full z-10 relative mt-auto"
      >
        <Footer />
      </motion.div>
    </div>
  );
}
