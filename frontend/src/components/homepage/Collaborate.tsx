"use client";

import { motion } from "framer-motion";
import realtimeImg from "@/assets/CollabRealtime.png";
import shareImg from "@/assets/CollabShare.png";
import runImg from "@/assets/CollabRun.png";

const easeCurve = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const features = [
  {
    title: "Real-time editing",
    description:
      "Edits sync across everyone in the room as they're typed.",
    image: realtimeImg,
    alt: "Code being edited live in an InterviewLab room",
    position: "object-left-top",
  },
  {
    title: "Share with a link",
    description:
      "Copy the link and share it. Anyone can join the room instantly.",
    image: shareImg,
    alt: "Share dropdown with a room invite link",
    position: "object-top",
  },
  {
    title: "In-browser execution",
    description:
      "Write, run, and debug your code directly in the room, with no setup.",
    image: runImg,
    alt: "Code output shown next to the Run button",
    position: "object-top",
  },
];

export default function Collaborate() {
  return (
    <section className="relative py-24 px-8 md:px-16 lg:px-24">
      <div className="relative max-w-6xl mx-auto grid md:grid-cols-3 gap-10 md:gap-8">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.12, ease: easeCurve }}
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="h-48 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <img
                src={feature.image}
                alt={feature.alt}
                className={`w-full h-full object-cover ${feature.position}`}
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
    </section>
  );
}
