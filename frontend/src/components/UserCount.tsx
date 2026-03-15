import { Users, Copy } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useParams } from "react-router-dom";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UserCountProps {
  count: number;
}

export default function UserCount({ count }: UserCountProps) {
  const { theme } = useTheme();
  const { roomID } = useParams<{ roomID: string }>();
  const shareURL = `${window.location.origin}/lab/${roomID}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareURL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer focus-visible:ring-0 focus-visible:outline-none ${
            theme === "dark"
              ? "text-[#ccc] hover:bg-[#2d2d30]"
              : "text-[#57606a] hover:bg-[#e8e8e8]"
          }`}
          title={`${count} user${count !== 1 ? "s" : ""} online — click to share`}
        >
          <Users className="h-4 w-4" />
          <span className={`text-sm font-medium ${
            theme === "dark" ? "text-[#ccc]" : "text-[#57606a]"
          }`}>
            {count}
          </span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={8}
        className={`w-80 border shadow-lg rounded p-1 ${
          theme === "dark"
            ? "bg-[#252526] border-[#3c3c3c]"
            : "bg-white border-[#d1d5db] shadow-md"
        }`}
      >
        <DropdownMenuLabel
          className={`pb-3 pt-2 px-3 font-medium ${
            theme === "dark" ? "text-[#cccccc]" : "text-[#24292f]"
          }`}
        >
          {count} user{count !== 1 ? "s" : ""} in room — share to invite
        </DropdownMenuLabel>

        <div className="flex items-center gap-3 px-3 pb-3">
          <div className="flex-1">
            <Input
              readOnly
              value={shareURL}
              className={`text-sm rounded focus:ring-2 focus:ring-[#007acc]/20 focus:border-[#007acc]/40 ${
                theme === "dark"
                  ? "bg-[#2d2d30] border-[#3c3c3c] text-[#cccccc]"
                  : "bg-white border-[#d1d5db] text-[#24292f]"
              }`}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className={`shrink-0 rounded transition-all duration-200 ${
              theme === "dark"
                ? "bg-[#2d2d30] hover:bg-[#094771] border-[#3c3c3c] hover:border-[#007acc]"
                : "bg-white hover:bg-[#e8f4fd] border-[#d1d5db] hover:border-[#007acc]"
            }`}
          >
            <Copy
              size={16}
              className={
                copied
                  ? "text-green-500"
                  : theme === "dark"
                  ? "text-[#cccccc]/70 hover:text-[#cccccc]"
                  : "text-[#57606a] hover:text-[#24292f]"
              }
            />
          </Button>
        </div>

        <div className="px-3 pb-2">
          <p
            className={`text-xs rounded px-3 py-2 ${
              theme === "dark"
                ? "text-[#cccccc]/70 bg-[#2d2d30]"
                : "text-[#57606a] bg-[#f3f4f6]"
            }`}
          >
            Anyone with this link can join your interview room
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
