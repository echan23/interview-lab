"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Play, Lightbulb, ClipboardList } from "lucide-react";
import generateImg from "@/assets/GenerateFeatureExample.png";
import runImg from "@/assets/RunFeatureExample.png";
import questionImg from "@/assets/QuestionBoardExample.png";
import weakHintImg from "@/assets/WeakHintExample.png";
import BrowserFrame from "./BrowserFrame";
import CreateRoomButton from "./CreateRoomButton";

const features = [
  {
    title: "AI-Generated Questions",
    description:
      "Practice with questions tailored by company, topic and difficulty, or generate random questions instantly.",
    image: generateImg,
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    title: "Run Code In-Browser",
    description:
      "Test solutions in real time with zero setup: write, run and repeat directly from the browser.",
    image: runImg,
    icon: <Play className="w-4 h-4" />,
  },
  {
    title: "Bring Your Own Question",
    description:
      "Paste any problem into the question board and keep it pinned beside your code while you work.",
    image: questionImg,
    icon: <ClipboardList className="w-4 h-4" />,
  },
  {
    title: "Contextual Hints",
    description:
      "Hints read your question and your code, nudging you forward without spoiling the solution.",
    image: weakHintImg,
    icon: <Lightbulb className="w-4 h-4" />,
  },
];

const AUTOPLAY_MS = 5000;
const easeCurve = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

export default function Features() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % features.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, next]);

  const feature = features[current];

  return (
    <section className="relative py-28 px-8 md:px-16 lg:px-24 bg-neutral-50/60">
      <div className="absolute top-0 left-8 right-8 md:left-16 md:right-16 lg:left-24 lg:right-24 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeCurve }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 max-w-12 bg-neutral-300" />
            <span className="font-body text-xs uppercase tracking-[0.3em] text-neutral-400">
              Features
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 max-w-2xl">
            Everything you need to ace your next technical interview
          </h2>
        </motion.div>

        {/* Carousel */}
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Image */}
          <div className="relative overflow-hidden rounded-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BrowserFrame src={feature.image} alt={feature.title} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots + info */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              {features.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-6 h-2 bg-neutral-800"
                      : "w-2 h-2 bg-neutral-300 hover:bg-neutral-400"
                  }`}
                  aria-label={`Go to feature ${i + 1}`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-neutral-600 border border-neutral-200 shadow-sm">
                    {feature.icon}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-neutral-900">
                    {feature.title}
                  </h3>
                </div>
                <p className="font-body text-sm text-neutral-500 leading-relaxed max-w-md mx-auto">
                  {feature.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: easeCurve }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <p className="font-body text-sm text-neutral-400 mb-6">
            Ready to start practicing?
          </p>
          <CreateRoomButton />
        </motion.div>
      </div>
    </section>
  );
}
