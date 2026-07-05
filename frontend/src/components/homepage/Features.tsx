"use client";

import { motion } from "framer-motion";
import generateImg from "@/assets/AIGenerateCrop.png";
import hintImg from "@/assets/AIHintCrop.png";
import CreateRoomButton from "./CreateRoomButton";

const easeCurve = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const features = [
  {
    title: "AI-generated questions",
    description:
      "Pick a difficulty, company, and topic. A tailored interview question is written straight into the editor.",
    image: generateImg,
    alt: "Generate question popover with difficulty, company, and topic options",
  },
  {
    title: "AI hints that read your code",
    description:
      "Stuck? Hints look at the question and your current code, nudging you forward without giving away the solution.",
    image: hintImg,
    alt: "Hint panel suggesting an optimization without revealing the answer",
  },
];

export default function Features() {
  return (
    <section className="relative py-24 px-8 md:px-16 lg:px-24 bg-neutral-50/60">
      <div className="absolute top-0 left-8 right-8 md:left-16 md:right-16 lg:left-24 lg:right-24 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      <div className="relative max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 md:gap-12">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: easeCurve }}
              viewport={{ once: true, margin: "-80px" }}
            >
              <div className="h-72 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm flex items-center justify-center">
                <img
                  src={feature.image}
                  alt={feature.alt}
                  className="max-h-full w-auto"
                />
              </div>
              <h3 className="font-display text-lg font-bold text-neutral-900 mt-5 mb-1.5">
                {feature.title}
              </h3>
              <p className="font-body text-sm text-neutral-500 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: easeCurve }}
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
