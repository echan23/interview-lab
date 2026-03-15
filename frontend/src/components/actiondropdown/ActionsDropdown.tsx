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

const PYTHON_API_URL = import.meta.env.VITE_PYTHON_URL;

type ActionsDropdownProps = {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  popoverSide?: "top" | "right" | "bottom" | "left";
  compact?: boolean;
};

export default function ActionsDropdown({ editorRef, popoverSide = "right", compact = false }: ActionsDropdownProps) {
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
      setTimeout(() => setIsGenerating(false), 2000);
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
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={`relative ${compact ? "h-7 w-7" : "h-10 w-10"} rounded-lg transition-all duration-150 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${
              theme === "dark"
                ? "text-purple-300"
                : `${open ? "text-purple-500" : "text-[#6e7681] hover:text-purple-500"}`
            }`}
          >
            <Sparkles className={`${compact ? "h-4 w-4" : "h-6 w-6"} transition-all duration-150`} />
          </Button>
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
                className={`w-full h-9 text-sm font-medium rounded-md transition-colors flex items-center justify-center ${
                  theme === "dark"
                    ? "bg-[#2d2d30] hover:bg-[#094771] text-[#cccccc] border border-[#3c3c3c] hover:shadow-md hover:shadow-[#007acc]/20"
                    : "bg-[#f3f3f3] hover:bg-[#e8f4fd] text-[#383a42] border border-[#e5e5e5] hover:shadow-sm hover:shadow-[#007acc]/10"
                }`}
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

    </div>
  );
}
