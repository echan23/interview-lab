import { useEffect, useCallback } from "react";
import CodeEditor from "../components/CodeEditor.tsx";
import Output from "../components/Output.tsx";
import HintTerminal from "../components/HintTerminal.tsx";
import type { Hint } from "../components/HintTerminal.tsx";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { ImperativePanelHandle } from "react-resizable-panels";
import Sidebar from "../components/Sidebar.tsx";
import type { SidebarPosition } from "../components/Sidebar.tsx";
import { useState, useRef } from "react";
import * as monaco from "monaco-editor";
import {
  handleEditorUpdateEvent,
  updateEditorContentEvent,
} from "../api/events.ts";
import connect, { disconnect } from "../api/websocket.ts";
import type { StopwatchState } from "../api/websocket.ts";
import type { Edit, Init } from "../data/types.ts";
import { useParams } from "react-router-dom";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider.tsx";
import { useNavigate } from "react-router-dom";
import { Sparkles, LogOut, Lightbulb, Sun, ChevronLeft, ChevronUp, ClipboardList } from "lucide-react";
import QuestionPanel from "../components/QuestionPanel.tsx";

const STORAGE_KEY = "sidebar-position-v2";
const LAYOUT_STORAGE_KEY = "panel-layout";

type PanelLayout = "horizontal" | "vertical";

function getInitialLayout(): PanelLayout {
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (stored === "horizontal" || stored === "vertical") return stored;
  return "horizontal";
}

function getInitialPosition(): SidebarPosition {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "left" || stored === "top" || stored === "right" || stored === "bottom") {
    return stored;
  }
  return "bottom";
}

function getNearestEdge(clientX: number, clientY: number): SidebarPosition {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const distances: [SidebarPosition, number][] = [
    ["left", clientX],
    ["right", w - clientX],
    ["top", clientY],
    ["bottom", h - clientY],
  ];
  distances.sort((a, b) => a[1] - b[1]);
  return distances[0][0];
}

// Floating pill placement for horizontal (top/bottom) positions
const pillPosClasses: Record<"top" | "bottom", string> = {
  top: "top-3 left-1/2 -translate-x-1/2",
  bottom: "bottom-3 left-1/2 -translate-x-1/2",
};

const QUESTION_MIN_WIDTH = 220;
const QUESTION_MAX_WIDTH = 560;

const RoomContent = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [userCount, setUserCount] = useState(1);
  const socketRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { roomID } = useParams();

  // Room-shared stopwatch state, synced over the websocket
  const [stopwatchState, setStopwatchState] = useState<StopwatchState>({
    startTime: 0,
    elapsedTime: 0,
    running: false,
  });

  // Pasted problem statement — read by HintButton at request time, persisted per room
  const questionStorageKey = `question-${roomID}`;
  const questionRef = useRef<string>(localStorage.getItem(questionStorageKey) ?? "");
  const [isQuestionPanelVisible, setIsQuestionPanelVisible] = useState(
    () => questionRef.current.trim().length > 0
  );

  const handleQuestionChange = useCallback(
    (value: string) => {
      questionRef.current = value;
      localStorage.setItem(questionStorageKey, value);
    },
    [questionStorageKey]
  );

  // Question board width: CSS-animated open/close + manual drag resize
  const [questionWidth, setQuestionWidth] = useState(320);
  const questionWidthRef = useRef(320);
  const [isResizingQuestion, setIsResizingQuestion] = useState(false);

  const handleQuestionResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingQuestion(true);
    const startX = e.clientX;
    const startWidth = questionWidthRef.current;

    const onMouseMove = (ev: MouseEvent) => {
      const next = Math.min(
        QUESTION_MAX_WIDTH,
        Math.max(QUESTION_MIN_WIDTH, startWidth + ev.clientX - startX)
      );
      questionWidthRef.current = next;
      setQuestionWidth(next);
    };
    const onMouseUp = () => {
      setIsResizingQuestion(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  const [sidebarPosition, setSidebarPosition] = useState<SidebarPosition>(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewEdge, setDragPreviewEdge] = useState<SidebarPosition | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  // Hint panel state
  const [hints, setHints] = useState<Hint[]>([]);
  const [isHintPanelVisible, setIsHintPanelVisible] = useState(false);

  const handleHintReceived = useCallback((hint: Hint) => {
    setHints([hint]);
    setIsHintPanelVisible(true);
  }, []);

  const handleHintPanelClose = useCallback(() => {
    setIsHintPanelVisible(false);
  }, []);

  // Resize handle, layout toggle, collapsible output
  const [isResizing, setIsResizing] = useState(false);
  const [panelLayout, setPanelLayout] = useState<PanelLayout>(getInitialLayout);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);
  const outputPanelRef = useRef<ImperativePanelHandle>(null);

  const handleToggleLayout = useCallback(() => {
    setPanelLayout((prev) => {
      const next = prev === "horizontal" ? "vertical" : "horizontal";
      localStorage.setItem(LAYOUT_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const handleToggleCollapse = useCallback(() => {
    const panel = outputPanelRef.current;
    if (!panel) return;
    if (isOutputCollapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [isOutputCollapsed]);

  // Mouse-based drag handlers (passed to Sidebar)
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
    setDragPreviewEdge(getNearestEdge(e.clientX, e.clientY));

    const onMouseMove = (ev: MouseEvent) => {
      setDragPos({ x: ev.clientX, y: ev.clientY });
      setDragPreviewEdge(getNearestEdge(ev.clientX, ev.clientY));
    };

    const onMouseUp = (ev: MouseEvent) => {
      const nearest = getNearestEdge(ev.clientX, ev.clientY);
      setSidebarPosition(nearest);
      localStorage.setItem(STORAGE_KEY, nearest);
      setIsDragging(false);
      setDragPreviewEdge(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  //Handle updates to the editor
  const handleReceiveEditorUpdate = (receivedEdits: Edit[]) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    updateEditorContentEvent(editor, receivedEdits);
  };

  //Flag to determine when the editor is mounted, we need to mount editor before applying updates
  const [editorMounted, setEditorMounted] = useState(false);
  //Handles retrieval of codefile when the client joins
  const handleReceiveEditorInit = (init: Init) => {
    console.log("init editor content:", init.content);
    const editor = editorRef.current;
    if (!editor) {
      console.error("No editor found");
      return;
    }
    editor.setValue(init.content);

    /*Local update listener that must be attached after the init content is set or else it will interpret the init as a local updates*/
    handleEditorUpdateEvent(editor);
  };
  useEffect(() => {
    if (!roomID) {
      console.error("No roomID in URL, can't start socket");
      return;
    }
    if (!editorMounted) {
      console.log("editor not mounted yet");
      return;
    }

    console.log("Attempting to start socket from Room.tsx");
    const socket = connect(
      roomID,
      handleReceiveEditorUpdate,
      handleReceiveEditorInit,
      setUserCount,
      setStopwatchState,
      navigate
    );
    socketRef.current = socket;
    return () => {
      console.log("cleanup closing socket");
      disconnect();
    };
  }, [roomID, editorMounted]);

  // Drag preview: ghost sidebar that follows cursor and rotates
  const previewIsVertical = dragPreviewEdge === "left" || dragPreviewEdge === "right";
  const sidebarIsVertical = sidebarPosition === "left" || sidebarPosition === "right";

  const sidebarElement = (
    <Sidebar
      editorRef={editorRef}
      position={sidebarPosition}
      onDragStart={handleDragStart}
      onHintReceived={handleHintReceived}
      questionRef={questionRef}
      questionOpen={isQuestionPanelVisible}
      onToggleQuestion={() => setIsQuestionPanelVisible((v) => !v)}
    />
  );

  return (
    <div
      className={`app-container h-screen w-screen overflow-hidden relative ${
        theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
      }`}
    >
      {/* Floating drag preview ghost */}
      {isDragging && dragPreviewEdge && (
        <div
          className={`fixed z-[100] pointer-events-none transition-[width,height] duration-150 ease-out shadow-2xl border rounded-xl backdrop-blur-sm ${
            theme === "dark"
              ? "bg-[#252526]/90 border-[#007acc]/50"
              : "bg-white/90 border-[#007acc]/50"
          } ${
            previewIsVertical
              ? "w-[48px] flex-col py-2 gap-1"
              : "h-[48px] flex-row px-2 gap-1"
          } flex items-center justify-center`}
          style={
            previewIsVertical
              ? { left: dragPos.x - 24, top: dragPos.y - 100, height: 200 }
              : { left: dragPos.x - 100, top: dragPos.y - 24, width: 200 }
          }
        >
          {[Sparkles, Lightbulb, ClipboardList, Sun, LogOut].map((Icon, i) => (
            <div key={i} className={`h-8 w-8 flex items-center justify-center ${theme === "dark" ? "text-[#b3b3b3]" : "text-[#6b7280]"}`}>
              <Icon className="h-4 w-4" />
            </div>
          ))}
        </div>
      )}

      {/* Floating pill for top/bottom positions */}
      {!sidebarIsVertical && (
        <div
          className={`fixed z-30 ${pillPosClasses[sidebarPosition as "top" | "bottom"]} ${
            isDragging ? "opacity-30" : ""
          }`}
        >
          {sidebarElement}
        </div>
      )}

      <div className="h-full w-full flex flex-row overflow-hidden">
        {/* Docked full-height rail for left/right positions */}
        {sidebarIsVertical && (
          <div
            className={`h-full shrink-0 ${sidebarPosition === "right" ? "order-last" : ""} ${
              isDragging ? "opacity-30" : ""
            }`}
          >
            {sidebarElement}
          </div>
        )}
        {/* Question board — stable left column, animated open/close, unaffected by the editor/output layout */}
        <div
          style={{ width: isQuestionPanelVisible ? questionWidth : 0 }}
          className={`shrink-0 overflow-hidden ${
            isResizingQuestion ? "" : "transition-[width] duration-300 ease-in-out"
          } ${theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"}`}
        >
          <div style={{ width: questionWidth }} className="h-full">
            <QuestionPanel
              initialValue={questionRef.current}
              onChange={handleQuestionChange}
              onClose={() => setIsQuestionPanelVisible(false)}
            />
          </div>
        </div>
        {isQuestionPanelVisible && (
          <div
            onMouseDown={handleQuestionResizeStart}
            className="relative w-3 shrink-0 cursor-col-resize group flex items-center justify-center"
          >
            <div
              className={`w-[2px] h-full transition-colors duration-150 ${
                isResizingQuestion
                  ? "bg-[#007acc]"
                  : theme === "dark"
                  ? "bg-[#282828] group-hover:bg-[#007acc]"
                  : "bg-[#ebebeb] group-hover:bg-[#007acc]"
              }`}
            />
            <div className="absolute flex flex-col gap-[3px]">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full transition-colors duration-150 ${
                    isResizingQuestion
                      ? "bg-[#007acc]"
                      : theme === "dark"
                      ? "bg-[#555] group-hover:bg-[#007acc]"
                      : "bg-[#bbb] group-hover:bg-[#007acc]"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Editor + output section — layout toggle only affects these panels */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${
            theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
          }`}
        >
          <PanelGroup direction={panelLayout} key={panelLayout}>
            <Panel defaultSize={isHintPanelVisible ? 50 : 70} minSize={20}>
              <div className="flex h-full overflow-auto">
                <CodeEditor
                  editorRef={editorRef}
                  onSelectedLanguage={(language) =>
                    setSelectedLanguage(language)
                  }
                  setEditorMounted={setEditorMounted}
                  userCount={userCount}
                  stopwatchState={stopwatchState}
                />
              </div>
            </Panel>
            <PanelResizeHandle
              onDragging={setIsResizing}
              className={`group relative flex items-center justify-center ${
                panelLayout === "horizontal"
                  ? "w-3 cursor-col-resize"
                  : "h-3 cursor-row-resize"
              }`}
              onDoubleClick={handleToggleCollapse}
            >
              {/* Visible line */}
              <div
                className={`${
                  panelLayout === "horizontal" ? "w-[2px] h-full" : "h-[2px] w-full"
                } transition-colors duration-150 ${
                  isResizing
                    ? "bg-[#007acc]"
                    : theme === "dark"
                    ? "bg-[#282828] group-hover:bg-[#007acc]"
                    : "bg-[#ebebeb] group-hover:bg-[#007acc]"
                }`}
              />
              {/* Grip dots */}
              {!isOutputCollapsed && (
                <div
                  className={`absolute flex ${
                    panelLayout === "horizontal" ? "flex-col" : "flex-row"
                  } gap-[3px]`}
                >
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full transition-colors duration-150 ${
                        isResizing
                          ? "bg-[#007acc]"
                          : theme === "dark"
                          ? "bg-[#555] group-hover:bg-[#007acc]"
                          : "bg-[#bbb] group-hover:bg-[#007acc]"
                      }`}
                    />
                  ))}
                </div>
              )}
              {/* Chevron button when collapsed */}
              {isOutputCollapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleCollapse();
                  }}
                  className={`absolute z-10 flex items-center justify-center rounded-sm transition-colors ${
                    panelLayout === "horizontal" ? "w-5 h-8" : "h-5 w-8"
                  } ${
                    theme === "dark"
                      ? "bg-[#2d2d30] hover:bg-[#3e3e42] text-[#858585]"
                      : "bg-[#e5e5e5] hover:bg-[#d4d4d4] text-[#6e7681]"
                  }`}
                >
                  {panelLayout === "horizontal" ? (
                    <ChevronLeft className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </PanelResizeHandle>
            <Panel
              ref={outputPanelRef}
              defaultSize={isHintPanelVisible ? 25 : 30}
              minSize={10}
              collapsible={true}
              collapsedSize={0}
              onCollapse={() => setIsOutputCollapsed(true)}
              onExpand={() => setIsOutputCollapsed(false)}
            >
              <div className="output-container-wrapper h-full overflow-auto flex flex-col">
                <Output
                  language={selectedLanguage}
                  editorRef={editorRef}
                  panelLayout={panelLayout}
                  onToggleLayout={handleToggleLayout}
                />
              </div>
            </Panel>
            {isHintPanelVisible && (
              <>
                <PanelResizeHandle
                  className={`group relative flex items-center justify-center ${
                    panelLayout === "horizontal"
                      ? "w-3 cursor-col-resize"
                      : "h-3 cursor-row-resize"
                  }`}
                >
                  <div
                    className={`${
                      panelLayout === "horizontal" ? "w-[2px] h-full" : "h-[2px] w-full"
                    } transition-colors duration-150 ${
                      theme === "dark"
                        ? "bg-[#282828] group-hover:bg-[#007acc]"
                        : "bg-[#ebebeb] group-hover:bg-[#007acc]"
                    }`}
                  />
                  <div
                    className={`absolute flex ${
                      panelLayout === "horizontal" ? "flex-col" : "flex-row"
                    } gap-[3px]`}
                  >
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full transition-colors duration-150 ${
                          theme === "dark"
                            ? "bg-[#555] group-hover:bg-[#007acc]"
                            : "bg-[#bbb] group-hover:bg-[#007acc]"
                        }`}
                      />
                    ))}
                  </div>
                </PanelResizeHandle>
                <Panel
                  defaultSize={25}
                  minSize={10}
                  collapsible={true}
                  collapsedSize={0}
                  onCollapse={() => setIsHintPanelVisible(false)}
                >
                  <div className="h-full overflow-auto flex flex-col">
                    <HintTerminal hints={hints} onClose={handleHintPanelClose} />
                  </div>
                </Panel>
              </>
            )}
          </PanelGroup>
        </div>
      </div>
    </div>
  );
};

const Room = () => {
  return (
    <ThemeProvider>
      <RoomContent />
    </ThemeProvider>
  );
};

export default Room;
