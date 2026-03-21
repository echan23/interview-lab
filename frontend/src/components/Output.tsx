import { executeCode } from "@/api/piston";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Loader2, Columns2, Rows2 } from "lucide-react";
import { useState } from "react";
import * as monaco from "monaco-editor";
import { useTheme } from "@/components/ThemeProvider";

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
      setTimeout(() => setIsRunning(false), 800);
    }
  };

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
              className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                theme === "dark"
                  ? "text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d30]"
                  : "text-[#6e7681] hover:text-[#383a42] hover:bg-[#e5e5e5]"
              }`}
              title={panelLayout === "horizontal" ? "Switch to stacked layout" : "Switch to side-by-side layout"}
            >
              {panelLayout === "horizontal" ? (
                <Rows2 className="h-3.5 w-3.5" />
              ) : (
                <Columns2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <Button
            onClick={runCode}
            disabled={isRunning}
            size="sm"
            className="h-7 rounded px-3 text-xs font-medium text-white bg-[#22c55e] hover:bg-[#16a34a] transition-colors duration-150 active:scale-95"
          >
            {isRunning ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-3 w-3" />
            )}
            {isRunning ? "Running" : "Run"}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <pre
            className={`p-4 font-mono text-sm whitespace-pre-wrap ${
              theme === "dark" ? "text-[#cccccc]" : "text-[#383a42]"
            }`}
          >
            {output}
          </pre>
        </ScrollArea>
      </div>
    </div>
  );
}
