"use client";

import * as React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { useState } from "react";
import * as monaco from "monaco-editor";
import { useTheme } from "@/components/ThemeProvider";
import RailTooltip from "./RailTooltip";
import type { Hint } from "./HintTerminal";

const API_URL = import.meta.env.VITE_DOMAIN_NAME;

type HintButtonProps = {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  popoverSide?: "top" | "right" | "bottom" | "left";
  compact?: boolean;
  onHintReceived: (hint: Hint) => void;
  wrapperClassName?: string;
  label?: string;
  questionRef?: React.MutableRefObject<string>;
};

export default function HintButton({ editorRef, popoverSide = "right", compact = false, onHintReceived, wrapperClassName, label, questionRef }: HintButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [isHinting, setIsHinting] = useState(false);
  const { theme } = useTheme();

  async function handleHintClick(hintType: "weak" | "strong") {
    const code = editorRef.current?.getValue() || "";
    const question = questionRef?.current.trim() ?? "";

    if (!code.trim() && !question) {
      alert("Please enter some code or paste a question first.");
      return;
    }

    // Prepend the pasted question so hints understand the problem being solved
    const context = question
      ? `Problem statement (provided by the user):\n${question}\n\n---\n\nCurrent code:\n${code}`
      : code;

    setIsHinting(true);
    try {
      const res = await fetch(`${API_URL}/api/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: context, hintType }),
      });

      const data = await res.json();

      if (hintType === "strong" && data.hints) {
        onHintReceived({ type: hintType, text: "", hints: data.hints });
      } else if (data.hint) {
        onHintReceived({ type: hintType, text: data.hint });
      } else {
        alert(data.error || "Failed to retrieve hint.");
      }
    } catch (error) {
      console.error("Hint request failed:", error);
      alert("Error connecting to the server.");
    } finally {
      setIsHinting(false);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={wrapperClassName ?? ""}>
          <Lightbulb
            className={`${compact ? "h-4 w-4" : "h-5 w-5"} transition-colors duration-100 ${
              theme === "dark"
                ? open
                  ? "text-amber-400"
                  : "text-[#b3b3b3] group-hover:text-amber-400"
                : open
                ? "text-amber-500"
                : "text-[#6b7280] group-hover:text-amber-500"
            }`}
          />
          {label && !open && (
            <RailTooltip label={label} side={popoverSide} theme={theme} />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={popoverSide}
        align="start"
        sideOffset={8}
        className={`w-56 p-4 border shadow-lg rounded ${
          theme === "dark"
            ? "bg-[#252526] border-[#3c3c3c]"
            : "bg-white border-[#d1d5db] shadow-md"
        }`}
      >
        <div className="space-y-2">
          <p
            className={`text-xs font-medium ${
              theme === "dark" ? "text-[#cccccc]/70" : "text-[#57606a]"
            }`}
          >
            Get hints
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`flex-1 h-9 text-sm font-medium rounded-md transition-colors ${
                theme === "dark"
                  ? "border-[#3c3c3c] bg-[#2d2d30] hover:bg-[#094771] hover:shadow-md hover:shadow-[#007acc]/20 text-[#cccccc] hover:text-white"
                  : "border-[#d1d5db] bg-[#f3f4f6] hover:bg-[#e8f4fd] hover:shadow-sm hover:shadow-[#007acc]/10 text-[#24292f]"
              }`}
              onClick={() => handleHintClick("weak")}
              disabled={isHinting}
            >
              {isHinting ? (
                <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
              ) : (
                "Weak"
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`flex-1 h-9 text-sm font-medium rounded-md transition-colors ${
                theme === "dark"
                  ? "border-[#3c3c3c] bg-[#2d2d30] hover:bg-[#094771] hover:shadow-md hover:shadow-[#007acc]/20 text-[#cccccc] hover:text-white"
                  : "border-[#d1d5db] bg-[#f3f4f6] hover:bg-[#e8f4fd] hover:shadow-sm hover:shadow-[#007acc]/10 text-[#24292f]"
              }`}
              onClick={() => handleHintClick("strong")}
              disabled={isHinting}
            >
              {isHinting ? (
                <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
              ) : (
                "Strong"
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
