import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import RailTooltip from "./RailTooltip";
import { useState } from "react";

type QuestionPanelProps = {
  initialValue: string;
  onChange: (value: string) => void;
  onClose: () => void;
};

export default function QuestionPanel({ initialValue, onChange, onClose }: QuestionPanelProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center justify-between pl-4 pr-1.5 py-2 shrink-0 ${
          theme === "dark" ? "bg-[#1e1e1e]" : "bg-white"
        }`}
      >
        <span
          className={`text-xs font-medium uppercase tracking-wider ${
            theme === "dark" ? "text-[#a3a3a3]" : "text-[#6e7681]"
          }`}
        >
          Question
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close question panel"
          className={`relative group h-6 w-6 rounded-sm transition-colors duration-100 ${
            theme === "dark"
              ? "text-[#a3a3a3] hover:text-white hover:bg-[#2d2d30]"
              : "text-[#6e7681] hover:text-[#24292f] hover:bg-[#e5e5e5]"
          }`}
        >
          <X className="h-3.5 w-3.5" />
          <RailTooltip label="Close" side="bottom" theme={theme} />
        </Button>
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder="Paste the interview question here."
        spellCheck={false}
        className={`flex-1 min-h-0 w-full resize-none px-4 py-2 text-sm leading-relaxed bg-transparent outline-none select-text ${
          theme === "dark"
            ? "text-[#e6e6e6] placeholder:text-[#666]"
            : "text-[#24292f] placeholder:text-[#9ca3af]"
        }`}
      />
    </div>
  );
}
