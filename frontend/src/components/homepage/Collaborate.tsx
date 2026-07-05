"use client";

import { motion } from "framer-motion";
import { Zap, Link2, Play } from "lucide-react";
import shareImg from "@/assets/ShareInviteExample.png";
import BrowserFrame from "./BrowserFrame";

const easeCurve = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const points = [
  {
    icon: <Zap className="w-4 h-4" />,
    title: "Real-time editing",
    description:
      "Edits sync across everyone in the room as they're typed.",
  },
  {
    icon: <Link2 className="w-4 h-4" />,
    title: "Share with a link",
    description:
      "Copy the link and share it. Anyone can join the room instantly.",
  },
  {
    icon: <Play className="w-4 h-4" />,
    title: "In-browser execution",
    description:
      "Write, run, and debug your code directly in the room, with no setup.",
  },
];

export default function Collaborate() {
  return (
    <section className="relative py-24 px-8 md:px-16 lg:px-24">
      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeCurve }}
          viewport={{ once: true }}
        >
          <span className="font-body text-xs uppercase tracking-[0.3em] text-neutral-400">
            Collaboration
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 leading-tight mt-4 mb-8">
            Work through problems together, live.
          </h2>

          <div className="flex flex-col gap-6">
            {points.map((point, i) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.1, ease: easeCurve }}
                viewport={{ once: true }}
                className="flex gap-4"
              >
                <div className="flex items-center justify-center shrink-0 w-9 h-9 rounded-lg border border-neutral-200 text-neutral-700">
                  {point.icon}
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-neutral-900 mb-1">
                    {point.title}
                  </h3>
                  <p className="font-body text-sm text-neutral-500 leading-relaxed max-w-md">
                    {point.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Product shot */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: easeCurve }}
          viewport={{ once: true }}
          className="relative"
        >
          <BrowserFrame src={shareImg} alt="Sharing an InterviewLab room" />
        </motion.div>
      </div>
    </section>
  );
}
