"use client";

import * as React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import DifficultySelector from "./DifficultySelector";
import CompanySelector from "./CompanySelector";
import ContentSelector from "../ContentSelector";
import { Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import * as monaco from "monaco-editor";
import { useTheme } from "@/components/ThemeProvider";
import RailTooltip from "../RailTooltip";

const PYTHON_API_URL = import.meta.env.VITE_PYTHON_URL;

type ActionsDropdownProps = {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  popoverSide?: "top" | "right" | "bottom" | "left";
  compact?: boolean;
  wrapperClassName?: string;
  label?: string;
};

export default function ActionsDropdown({ editorRef, popoverSide = "right", compact = false, wrapperClassName, label }: ActionsDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [difficulty, setDifficulty] = React.useState("easy");
  const [company, setCompany] = React.useState(" ");
  const [topic, setTopic] = React.useState(" ");
  const [isGenerating, setIsGenerating] = useState(false);
  const { theme } = useTheme();

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch(`${PYTHON_API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty, company, topic }),
      });
      const data = await res.json();
      if (data.question) {
        const content = formatComment(data.question);
        const editor = editorRef.current;
        const model = editor?.getModel();

        if (editor && model) {
          const fullRange = model.getFullModelRange();

          const editOperation: monaco.editor.IIdentifiedSingleEditOperation = {
            range: fullRange,
            text: content,
            forceMoveMarkers: true,
          };

          editor.executeEdits("generate-question", [editOperation]);
          editor.pushUndoStop();
        }
      }
    } catch (error) {
      console.error(error);
      alert("Error connecting to server");
    } finally {
      setIsGenerating(false);
      setOpen(false);
    }
  }

  const formatComment = (content: string): string => {
    const language =
      editorRef.current?.getModel()?.getLanguageId() ?? "plaintext";

    if (["python"].includes(language)) {
      return `"""\n${content}\n"""`;
    }

    if (["java", "c", "cpp", "javascript", "typescript"].includes(language)) {
      return `/*\n${content}\n*/`;
    }

    return content
      .split("\n")
      .map((line) => `// ${line}`)
      .join("\n");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={wrapperClassName ?? ""}>
          <Sparkles
            className={`${compact ? "h-4 w-4" : "h-5 w-5"} transition-colors duration-100 ${
              theme === "dark"
                ? open
                  ? "text-purple-400"
                  : "text-[#b3b3b3] group-hover:text-purple-400"
                : open
                ? "text-purple-500"
                : "text-[#6b7280] group-hover:text-purple-500"
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
          className={`w-72 p-4 border shadow-lg rounded ${
            theme === "dark"
              ? "bg-[#252526] border-[#3c3c3c]"
              : "bg-[#f8f8f8] border-[#e5e5e5]"
          }`}
        >
          <div className="space-y-4">
            {/* Generation Section */}
            <div className="space-y-3">
              <DifficultySelector value={difficulty} onChange={setDifficulty} />
              <CompanySelector value={company} onChange={setCompany} />
              <ContentSelector value={topic} onChange={setTopic} />

              <Button
                variant="default"
                className="w-full h-9 text-sm font-medium rounded-md flex items-center justify-center text-white bg-[#007acc] hover:bg-[#0062a3] transition-colors duration-100 active:scale-[0.98]"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>

          </div>
        </PopoverContent>
    </Popover>
  );
}
