import React from "react";
import { useState, useEffect } from "react";
import * as monaco from "monaco-editor";
import Editor from "@monaco-editor/react";
import { editor as MonacoEditor } from "monaco-editor";
import LanguageSelector from "./LanguageSelector";
import UserCount from "./UserCount";
import { useTheme } from "@/components/ThemeProvider";

type CodeEditorProps = {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  onSelectedLanguage: (value: string) => void;
  setEditorMounted: (value: boolean) => void;
  userCount: number;
};

const CodeEditor = ({
  editorRef,
  onSelectedLanguage,
  setEditorMounted,
  userCount,
}: CodeEditorProps) => {
  const [currentLanguage, setCurrentLanguage] = useState("python");
  const { theme } = useTheme();

  const handleSelectLanguage = (language: string) => {
    setCurrentLanguage(language);
    onSelectedLanguage(language);
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
        className={`px-3 py-2 flex justify-between items-center shrink-0 ${
          theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
        }`}
      >
        <LanguageSelector onSelect={handleSelectLanguage} />
        <div className="flex items-center gap-2">
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
          options={{
            minimap: { enabled: false },
            wordWrap: "on",
            renderLineHighlight: "line",
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
