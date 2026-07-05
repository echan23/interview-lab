import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronDown } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import RailTooltip from "./RailTooltip";
import { useEffect, useRef, useState } from "react";

export type Hint = {
  type: "weak" | "strong";
  text: string;
  hints?: string[]; // For strong hints: 4 progressive hints
};

interface HintTerminalProps {
  hints: Hint[];
  onClose: () => void;
}

const HINT_LABELS = ["Hint 1", "Hint 2", "Hint 3", "Solution"];

function StrongHintGroup({ hints, theme }: { hints: string[]; theme: string }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="space-y-1.5">
      {hints.map((hint, i) => {
        const isExpanded = expanded[i] ?? false;
        const label = HINT_LABELS[i] ?? `Hint ${i + 1}`;
        const isLast = i === hints.length - 1;
        return (
          <div
            key={i}
            className={`rounded-md transition-colors ${
              theme === "dark" ? "bg-[#252526]" : "bg-[#f6f8fa]"
            }`}
          >
            <button
              onClick={() => toggle(i)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                theme === "dark"
                  ? "text-[#cccccc]/80 hover:text-[#cccccc]"
                  : "text-[#57606a] hover:text-[#24292f]"
              }`}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
              <span className={isLast ? (theme === "dark" ? "text-amber-400" : "text-amber-600") : ""}>
                {label}
              </span>
            </button>
            {isExpanded && (
              <div
                className={`px-3 pb-2.5 ml-5 text-xs leading-relaxed whitespace-pre-wrap select-text ${
                  theme === "dark" ? "text-[#cccccc]" : "text-[#24292f]"
                }`}
              >
                {hint}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HintTerminal({ hints, onClose }: HintTerminalProps) {
  const { theme } = useTheme();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hints.length]);

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center justify-between px-4 py-2 shrink-0 ${
          theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
        }`}
      >
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            theme === "dark" ? "text-[#cccccc]/70" : "text-[#57606a]"
          }`}
        >
          Hints
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close hints"
          className={`relative group h-6 w-6 rounded-sm transition-colors duration-100 ${
            theme === "dark"
              ? "text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d30]"
              : "text-[#6e7681] hover:text-[#24292f] hover:bg-[#e5e5e5]"
          }`}
        >
          <X className="h-3.5 w-3.5" />
          <RailTooltip label="Close" side="bottom" theme={theme} />
        </Button>
      </div>
      <ScrollArea
        className={`flex-1 select-text ${
          theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
        }`}
      >
        <div className="px-4 py-3 space-y-3">
          {hints.map((hint, i) => (
            <div key={i}>
              <div
                className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                  hint.type === "strong"
                    ? theme === "dark" ? "text-amber-400/70" : "text-amber-600/70"
                    : theme === "dark" ? "text-blue-400/70" : "text-blue-600/70"
                }`}
              >
                {hint.type === "strong" ? "Strong Hint" : "Weak Hint"}
              </div>
              {hint.type === "strong" && hint.hints ? (
                <StrongHintGroup hints={hint.hints} theme={theme} />
              ) : (
                <div
                  className={`text-xs leading-relaxed whitespace-pre-wrap ${
                    theme === "dark" ? "text-[#cccccc]" : "text-[#24292f]"
                  }`}
                >
                  {hint.text}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
