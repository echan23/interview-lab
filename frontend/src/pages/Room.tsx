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
import type { Edit, Init } from "../data/types.ts";
import { useParams } from "react-router-dom";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider.tsx";
import { useNavigate } from "react-router-dom";
import { Sparkles, LogOut, Lightbulb, Sun, ChevronLeft, ChevronUp } from "lucide-react";

const STORAGE_KEY = "sidebar-position";
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
  return "left";
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

const RoomContent = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [userCount, setUserCount] = useState(1);
  const socketRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();

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
  const { roomID } = useParams();
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
      navigate
    );
    socketRef.current = socket;
    return () => {
      console.log("cleanup closing socket");
      disconnect();
    };
  }, [roomID, editorMounted]);

  const isVertical = sidebarPosition === "left" || sidebarPosition === "right";
  const sidebarOrderLast = sidebarPosition === "right" || sidebarPosition === "bottom";
  const containerFlex = isVertical ? "flex-row" : "flex-col";

  // Drag preview: ghost sidebar that follows cursor and rotates
  const previewIsVertical = dragPreviewEdge === "left" || dragPreviewEdge === "right";

  // Separator border based on sidebar position
  const separatorClasses: Record<SidebarPosition, string> = {
    left: theme === "dark" ? "border-r border-[#2d2d30]" : "border-r border-[#e5e5e5]",
    right: theme === "dark" ? "border-l border-[#2d2d30]" : "border-l border-[#e5e5e5]",
    top: theme === "dark" ? "border-b border-[#2d2d30]" : "border-b border-[#e5e5e5]",
    bottom: theme === "dark" ? "border-t border-[#2d2d30]" : "border-t border-[#e5e5e5]",
  };

  return (
    <div
      className={`app-container h-screen w-screen flex ${containerFlex} overflow-hidden relative ${
        theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
      }`}
    >
      {/* Drop zone outlines on all 4 edges during drag */}
      {isDragging && (
        <>
          {(["left", "right", "top", "bottom"] as SidebarPosition[]).map((edge) => {
            const isActive = dragPreviewEdge === edge;
            const posClasses: Record<SidebarPosition, string> = {
              left: "left-0 top-0 w-[64px] h-full",
              right: "right-0 top-0 w-[64px] h-full",
              top: "top-0 left-0 h-[64px] w-full",
              bottom: "bottom-0 left-0 h-[64px] w-full",
            };
            return (
              <div
                key={edge}
                className={`fixed ${posClasses[edge]} pointer-events-none transition-all duration-200 border-2 border-dashed ${
                  isActive
                    ? "border-[#007acc] bg-[#007acc]/10"
                    : theme === "dark"
                    ? "border-[#444] bg-transparent"
                    : "border-[#ccc] bg-transparent"
                } z-40`}
              />
            );
          })}
        </>
      )}

      {/* Floating drag preview ghost */}
      {isDragging && dragPreviewEdge && (
        <div
          className={`fixed z-[100] pointer-events-none transition-[width,height] duration-150 ease-out shadow-2xl border backdrop-blur-sm ${
            theme === "dark"
              ? "bg-[#1e1e1e]/90 border-[#007acc]/50"
              : "bg-[#f8f9fa]/90 border-[#007acc]/50"
          } ${
            previewIsVertical
              ? "w-[48px] flex-col py-4 gap-1"
              : "h-[48px] flex-row px-4 gap-1"
          } flex items-center`}
          style={
            previewIsVertical
              ? { left: dragPos.x - 24, top: dragPos.y - 100, height: 200 }
              : { left: dragPos.x - 100, top: dragPos.y - 24, width: 200 }
          }
        >
          <div className={`h-10 w-10 flex items-center justify-center ${theme === "dark" ? "text-purple-300" : "text-purple-500"}`}>
            <Sparkles className="h-5 w-5" />
          </div>
          <div className={`h-10 w-10 flex items-center justify-center ${theme === "dark" ? "text-amber-400/70" : "text-amber-500/70"}`}>
            <Lightbulb className="h-5 w-5" />
          </div>
          <div className="flex-1" />
          <div className={`h-10 w-10 flex items-center justify-center ${theme === "dark" ? "text-yellow-400" : "text-[#616774]"}`}>
            <Sun className="h-5 w-5" />
          </div>
          <div className={`h-10 w-10 flex items-center justify-center ${theme === "dark" ? "text-red-400/70" : "text-red-500/70"}`}>
            <LogOut className="h-5 w-5" />
          </div>
        </div>
      )}

      <div className={`${sidebarOrderLast ? "order-last" : ""} ${isVertical ? "h-full" : "w-full"} ${isDragging ? "opacity-30" : ""} ${separatorClasses[sidebarPosition]}`}>
        <Sidebar
          editorRef={editorRef}
          position={sidebarPosition}
          onDragStart={handleDragStart}
          onHintReceived={handleHintReceived}
        />
      </div>

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
                } gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
                  isResizing ? "!opacity-100" : ""
                }`}
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-1 rounded-full ${
                      isResizing
                        ? "bg-[#007acc]"
                        : theme === "dark"
                        ? "bg-[#555]"
                        : "bg-[#bbb]"
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
                  } gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-150`}
                >
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        theme === "dark" ? "bg-[#555]" : "bg-[#bbb]"
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
