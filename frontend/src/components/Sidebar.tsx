import { LogOut, GripVertical, GripHorizontal, Sun, Moon, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ActionsDropdown from "./actiondropdown/ActionsDropdown";
import HintButton from "./HintButton";
import RailTooltip from "./RailTooltip";
import * as monaco from "monaco-editor";
import { useTheme } from "@/components/ThemeProvider";
import type { Hint } from "./HintTerminal";

export type SidebarPosition = "left" | "top" | "right" | "bottom";

type SidebarProps = {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  position: SidebarPosition;
  onDragStart: (e: React.MouseEvent) => void;
  onHintReceived: (hint: Hint) => void;
  questionRef: React.MutableRefObject<string>;
  questionOpen: boolean;
  onToggleQuestion: () => void;
};

const popoverSideMap: Record<SidebarPosition, "top" | "right" | "bottom" | "left"> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

/*
Two display modes:
- left/right: docked rail that fills the full height and sits in the layout,
  so it never overlaps the question board.
- top/bottom: floating pill centered along the edge.
*/
export default function Sidebar({
  editorRef,
  position,
  onDragStart,
  onHintReceived,
  questionRef,
  questionOpen,
  onToggleQuestion,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const isVertical = position === "left" || position === "right";
  const popoverSide = popoverSideMap[position];
  const GripIcon = isVertical ? GripHorizontal : GripVertical;

  const containerClasses = isVertical
    ? `flex flex-col items-center w-[48px] h-full py-2 gap-1 ${
        theme === "dark" ? "bg-[#1e1e1e] border-[#2d2d30]" : "bg-white border-[#e5e5e5]"
      } ${position === "left" ? "border-r" : "border-l"}`
    : `flex flex-row items-center h-[56px] px-2 gap-1 rounded-xl border shadow-lg backdrop-blur-sm ${
        theme === "dark"
          ? "bg-[#252526]/95 border-[#3c3c3c]"
          : "bg-white/95 border-[#e5e5e5]"
      }`;

  const itemSize = isVertical ? "h-9 w-9" : "h-10 w-10";
  const hoverBg = theme === "dark"
    ? isVertical
      ? "hover:bg-[#2d2d30]"
      : "hover:bg-[#3c3c3c]"
    : "hover:bg-[#f0f0f0]";
  const activeBg = theme === "dark"
    ? isVertical
      ? "bg-[#2d2d30]"
      : "bg-[#3c3c3c]"
    : "bg-[#e8f4fd]";

  const itemBase = `relative group flex items-center justify-center ${itemSize} rounded-lg cursor-pointer transition-colors duration-100`;
  const itemWrapper = `${itemBase} ${hoverBg}`;

  const mutedIcon =
    theme === "dark"
      ? "text-[#b3b3b3] group-hover:text-white"
      : "text-[#6b7280] group-hover:text-[#24292f]";

  return (
    <aside className={containerClasses}>
      <div
        className={`relative group flex items-center justify-center cursor-grab active:cursor-grabbing rounded-lg ${
          isVertical ? "h-5 w-9" : "h-10 w-5"
        } ${theme === "dark" ? "text-[#777] hover:text-[#b3b3b3]" : "text-[#c4c9d0] hover:text-[#6b7280]"}`}
        onMouseDown={onDragStart}
      >
        <GripIcon className="h-3.5 w-3.5" />
        <RailTooltip label="Drag to reposition" side={popoverSide} theme={theme} />
      </div>

      <ActionsDropdown
        editorRef={editorRef}
        popoverSide={popoverSide}
        wrapperClassName={itemWrapper}
        label="Generate question"
      />

      <HintButton
        editorRef={editorRef}
        popoverSide={popoverSide}
        onHintReceived={onHintReceived}
        wrapperClassName={itemWrapper}
        label="Get hints"
        questionRef={questionRef}
      />

      <div
        className={`${itemBase} ${
          questionOpen
            ? `${activeBg} ${theme === "dark" ? "text-[#4fc1ff]" : "text-[#007acc]"}`
            : `${hoverBg} ${mutedIcon}`
        }`}
        onClick={onToggleQuestion}
      >
        <ClipboardList className="h-5 w-5" />
        <RailTooltip
          label={questionOpen ? "Hide question" : "Paste question"}
          side={popoverSide}
          theme={theme}
        />
      </div>

      {/* Rail pushes utility actions to the far end; pill separates them with a divider */}
      {isVertical ? (
        <div className="flex-1" />
      ) : (
        <div className={`w-px h-6 mx-1 shrink-0 ${theme === "dark" ? "bg-[#3c3c3c]" : "bg-[#e5e5e5]"}`} />
      )}

      <div
        className={itemWrapper}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? (
          <Sun className={`h-5 w-5 ${mutedIcon}`} />
        ) : (
          <Moon className={`h-5 w-5 ${mutedIcon}`} />
        )}
        <RailTooltip
          label={theme === "dark" ? "Light mode" : "Dark mode"}
          side={popoverSide}
          theme={theme}
        />
      </div>

      <div
        className={`${itemBase} ${
          theme === "dark"
            ? "hover:bg-red-900/20 text-[#b3b3b3]"
            : "hover:bg-red-50 text-[#6b7280]"
        }`}
        onClick={() => navigate("/")}
      >
        <LogOut
          className={`h-5 w-5 transition-colors duration-100 ${
            theme === "dark" ? "group-hover:text-red-400" : "group-hover:text-red-500"
          }`}
        />
        <RailTooltip label="Exit room" side={popoverSide} theme={theme} />
      </div>
    </aside>
  );
}
