import React from "react";
import { useState, useEffect } from "react";
import * as monaco from "monaco-editor";
import Editor from "@monaco-editor/react";
import { editor as MonacoEditor } from "monaco-editor";
import LanguageSelector from "./LanguageSelector";
import UserCount from "./UserCount";
import Stopwatch from "./Stopwatch";
import { useTheme } from "@/components/ThemeProvider";
import type { StopwatchState } from "../api/websocket";
import CODE_TEMPLATES from "../data/CODE_TEMPLATES";

type CodeEditorProps = {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  onSelectedLanguage: (value: string) => void;
  setEditorMounted: (value: boolean) => void;
  userCount: number;
  stopwatchState: StopwatchState;
};

const CodeEditor = ({
  editorRef,
  onSelectedLanguage,
  setEditorMounted,
  userCount,
  stopwatchState,
}: CodeEditorProps) => {
  const [currentLanguage, setCurrentLanguage] = useState("python");
  const { theme } = useTheme();

  // True when the editor holds nothing the user would miss: empty or an untouched template
  const isBoilerplate = (content: string) =>
    content.trim() === "" ||
    Object.values(CODE_TEMPLATES).some((t) => t.trim() === content.trim());

  /*
  Insert the language's starter template so compiled languages (go/java/c/cpp)
  run without the user having to type package/main boilerplate. Uses
  executeEdits so the change syncs to collaborators like any other edit.
  */
  const applyTemplate = (language: string) => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    if (!isBoilerplate(model.getValue())) return;
    editor.executeEdits("language-template", [
      {
        range: model.getFullModelRange(),
        text: CODE_TEMPLATES[language] ?? "",
        forceMoveMarkers: true,
      },
    ]);
    editor.pushUndoStop();
  };

  const handleSelectLanguage = (language: string) => {
    setCurrentLanguage(language);
    onSelectedLanguage(language);
    applyTemplate(language);
  };

  function getResolvedTheme() {
    return theme === "dark" ? "vs-dark" : "vs";
  }

  function handleEditorDidMount(
    editor: MonacoEditor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
  ) {
    editorRef.current = editor;
    monacoInstance.editor.setTheme(getResolvedTheme());
    // Cmd/Ctrl+Enter runs the code without leaving the editor
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
      () => window.dispatchEvent(new CustomEvent("run-code"))
    );
    setEditorMounted(true);
  }

  // UseEffect for theme change
  useEffect(() => {
    if (!editorRef.current) return;
    monaco.editor.setTheme(getResolvedTheme());
  }, [theme]);

  return (
    <div
      className={`editor-container h-full w-full flex flex-col ${
        theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
      }`}
    >
      <div
        className={`px-3 py-1.5 flex justify-between items-center shrink-0 ${
          theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
        }`}
      >
        <LanguageSelector onSelect={handleSelectLanguage} />
        <div className="flex items-center gap-2">
          <Stopwatch state={stopwatchState} />
          <UserCount count={userCount} />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="python"
          language={currentLanguage}
          onMount={handleEditorDidMount}
          theme={getResolvedTheme()}
          loading={
            <div
              className={`h-full w-full ${
                theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
              }`}
            />
          }
          options={{
            minimap: { enabled: false },
            wordWrap: "on",
            renderLineHighlight: "line",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            padding: { top: 12 },
            fontSize: 14,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
