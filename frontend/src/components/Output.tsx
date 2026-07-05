import { executeCode } from "@/api/piston";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Loader2, Columns2, Rows2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import { useTheme } from "@/components/ThemeProvider";
import RailTooltip, { Kbd, isMac } from "./RailTooltip";

interface OutputProps {
  language: string;
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  panelLayout?: "horizontal" | "vertical";
  onToggleLayout?: () => void;
}

export default function Output({ language, editorRef, panelLayout, onToggleLayout }: OutputProps) {
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const { theme } = useTheme();

  const runCode = async () => {
    if (!editorRef.current) return;
    setIsRunning(true);
    try {
      const res = await executeCode(language, editorRef.current.getValue());
      setOutput(res.run.output || "No output");
    } catch {
      setOutput("Error running code");
    } finally {
      setIsRunning(false);
    }
  };

  // Triggered by Cmd/Ctrl+Enter inside the editor (see CodeEditor)
  const runCodeRef = useRef(runCode);
  runCodeRef.current = runCode;
  useEffect(() => {
    const handler = () => runCodeRef.current();
    window.addEventListener("run-code", handler);
    return () => window.removeEventListener("run-code", handler);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center justify-between px-4 py-2 shrink-0 ${
          theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
        }`}
      >
        <span
          className={`text-xs font-medium uppercase tracking-wider ${
            theme === "dark" ? "text-[#858585]" : "text-[#6e7681]"
          }`}
        >
          Output
        </span>
        <div className="flex items-center gap-1.5">
          {onToggleLayout && (
            <button
              onClick={onToggleLayout}
              className={`relative group h-7 w-7 flex items-center justify-center rounded transition-colors duration-100 ${
                theme === "dark"
                  ? "text-[#b3b3b3] hover:text-white hover:bg-[#2d2d30]"
                  : "text-[#6e7681] hover:text-[#383a42] hover:bg-[#e5e5e5]"
              }`}
            >
              {panelLayout === "horizontal" ? (
                <Rows2 className="h-3.5 w-3.5" />
              ) : (
                <Columns2 className="h-3.5 w-3.5" />
              )}
              <RailTooltip
                label={
                  panelLayout === "horizontal"
                    ? "Stack output below editor"
                    : "Move output beside editor"
                }
                side="left"
                theme={theme}
              />
            </button>
          )}
          <Button
            onClick={runCode}
            disabled={isRunning}
            size="sm"
            className="relative group h-7 rounded px-3 text-xs font-medium text-white bg-[#22c55e] hover:bg-[#16a34a] transition-colors duration-100 active:scale-[0.97]"
          >
            {isRunning ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-3 w-3" />
            )}
            {isRunning ? "Running" : "Run"}
            <RailTooltip
              side="left"
              theme={theme}
              label={
                <>
                  Run code
                  <Kbd theme={theme}>{isMac ? "⌘" : "Ctrl"}</Kbd>
                  <Kbd theme={theme}>↵</Kbd>
                </>
              }
            />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          {output ? (
            <pre
              className={`p-4 font-mono text-sm whitespace-pre-wrap transition-opacity duration-100 ${
                isRunning ? "opacity-50" : "opacity-100"
              } ${theme === "dark" ? "text-[#cccccc]" : "text-[#383a42]"}`}
            >
              {output}
            </pre>
          ) : (
            <p
              className={`p-4 font-mono text-sm ${
                theme === "dark" ? "text-[#666]" : "text-[#9ca3af]"
              }`}
            >
              {isRunning ? "Running…" : "Run your code to see output here."}
            </p>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
