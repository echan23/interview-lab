"use client";

import { motion } from "framer-motion";
import { Sparkles, Play, Lightbulb } from "lucide-react";
import generateImg from "@/assets/GenerateFeatureExample.png";
import runImg from "@/assets/RunFeatureExample.png";
import weakHintImg from "@/assets/WeakHintExample.png";
import strongHintImg from "@/assets/StrongHintExample.png";
import CreateRoomButton from "./CreateRoomButton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

export default function Features() {
  const coreFeatures = [
    {
      title: "AI-Generated Questions",
      description:
        "Practice with questions tailored by company, topic and difficulty — or generate random questions instantly.",
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
      title: "Contextual Hints",
      description:
        "Receive a quick hint first, then a full explanation when you're stuck.",
      images: [weakHintImg, strongHintImg],
      icon: <Lightbulb className="w-4 h-4" />,
    },
  ];

  return (
    <section className="relative py-32 px-8 md:px-16 lg:px-24">
      {/* Section divider line */}
      <div className="absolute top-0 left-8 right-8 md:left-16 md:right-16 lg:left-24 lg:right-24 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 max-w-12 bg-white/20" />
            <span className="font-body text-xs uppercase tracking-[0.3em] text-white/30">
              Features
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white/90 max-w-2xl">
            Everything you need to ace your next technical interview
          </h2>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {coreFeatures.map((feature, i) => (
            <motion.article
              key={i}
              variants={itemVariants}
              className={`group relative bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden transition-colors duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] ${
                feature.images ? "lg:col-span-2" : ""
              }`}
            >
              <div className="p-8">
                {/* Icon and title row */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.05] text-white/60 border border-white/[0.08]">
                    {feature.icon}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white/90">
                    {feature.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="font-body text-sm text-white/40 leading-relaxed mb-8 max-w-md">
                  {feature.description}
                </p>

                {/* Image(s) */}
                {feature.images ? (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {feature.images.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-black/20 transition-transform duration-300 group-hover:scale-[1.01]"
                      >
                        <img
                          src={src}
                          alt={`${feature.title} screenshot ${idx + 1}`}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-black/20 transition-transform duration-300 group-hover:scale-[1.01]">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
              </div>
            </motion.article>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          className="text-center mt-24"
        >
          <p className="font-body text-sm text-white/30 mb-6 tracking-wide">
            Ready to start practicing?
          </p>
          <CreateRoomButton />
        </motion.div>
      </div>
    </section>
  );
}
