import { Button } from "@/components/ui/button";
import { LogOut, GripVertical, GripHorizontal, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ActionsDropdown from "./actiondropdown/ActionsDropdown";
import HintButton from "./HintButton";
import * as monaco from "monaco-editor";
import { useTheme } from "@/components/ThemeProvider";

export type SidebarPosition = "left" | "top" | "right" | "bottom";

type SidebarProps = {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  position: SidebarPosition;
  onPositionChange: (pos: SidebarPosition) => void;
  onDragStart: (e: React.MouseEvent) => void;
};

const popoverSideMap: Record<SidebarPosition, "top" | "right" | "bottom" | "left"> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

function SidebarItem({ label, theme }: { label: string; theme: string; children?: React.ReactNode }) {
  return (
    <span className={`text-[9px] font-medium leading-none mt-0.5 ${
      theme === "dark" ? "text-[#ccc]" : "text-[#aaa]"
    }`}>
      {label}
    </span>
  );
}

export default function Sidebar({ editorRef, position, onPositionChange, onDragStart }: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const isVertical = position === "left" || position === "right";
  const popoverSide = popoverSideMap[position];
  const GripIcon = isVertical ? GripVertical : GripHorizontal;

  const iconSize = isVertical ? "h-10 w-10" : "h-7 w-7";
  const iconBtn = `${iconSize} rounded-lg transition-all duration-150 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent`;

  const asideClasses = isVertical
    ? `flex flex-col items-center w-[64px] shrink-0 py-3 gap-3 h-full`
    : `flex flex-row items-center h-[52px] shrink-0 px-3 gap-3`;

  const itemWrapper = `flex flex-col items-center gap-0 rounded-lg px-1.5 py-1 transition-all duration-150 cursor-pointer ${
    theme === "dark"
      ? "hover:bg-[#2d2d30]"
      : "hover:bg-[#e8e8e8]"
  }`;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`${asideClasses} ${
        theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
      } relative`}
    >
      <div className={itemWrapper}>
        <ActionsDropdown editorRef={editorRef} popoverSide={popoverSide} compact={!isVertical} />
        <SidebarItem label="Generate" theme={theme} />
      </div>

      <div className={itemWrapper}>
        <HintButton editorRef={editorRef} popoverSide={popoverSide} compact={!isVertical} />
        <SidebarItem label="Hints" theme={theme} />
      </div>

      {/* Drag zone */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className={`${isVertical ? "h-[65%] w-full" : "w-[65%] h-full"} flex items-center justify-center transition-opacity duration-200 cursor-grab active:cursor-grabbing ${
            isHovered ? "opacity-100" : "opacity-0"
          } ${theme === "dark" ? "text-[#666]" : "text-[#b0b5bd]"}`}
          title="Drag to reposition"
          onMouseDown={onDragStart}
        >
          <GripIcon className="h-4 w-4" />
        </div>
      </div>

      <div className={itemWrapper}>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={iconBtn}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className={`${isVertical ? "h-6 w-6" : "h-4 w-4"} text-yellow-400`} /> : <Moon className={`${isVertical ? "h-6 w-6" : "h-4 w-4"} text-[#616774]`} />}
        </Button>
        <SidebarItem label="Theme" theme={theme} />
      </div>

      <div className={`flex flex-col items-center gap-0 rounded-lg px-1.5 py-1 transition-all duration-150 cursor-pointer ${
        theme === "dark"
          ? "hover:bg-red-900/20"
          : "hover:bg-red-50"
      }`}>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate("/")}
          className={`${iconSize} rounded-lg transition-all duration-150 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${
            theme === "dark"
              ? "text-red-400"
              : "text-[#616774]"
          }`}
          title="Exit room"
        >
          <LogOut className={isVertical ? "h-6 w-6" : "h-4 w-4"} />
        </Button>
        <SidebarItem label="Exit" theme={theme} />
      </div>
    </aside>
  );
}
