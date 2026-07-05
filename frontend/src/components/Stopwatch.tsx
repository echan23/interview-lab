import { Play, Pause, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import RailTooltip from "./RailTooltip";
import { sendStopwatchEvent } from "../api/websocket";
import type { StopwatchState } from "../api/websocket";

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

type StopwatchProps = {
  state: StopwatchState;
};

/* Room-shared stopwatch — state is server-authoritative and synced over the websocket */
export default function Stopwatch({ state }: StopwatchProps) {
  const { theme } = useTheme();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [state.running]);

  const elapsedMs =
    state.elapsedTime + (state.running ? Math.max(0, now - state.startTime) : 0);
  const hasTime = elapsedMs > 0 || state.running;

  const buttonClass = `relative group h-6 w-6 flex items-center justify-center rounded transition-colors duration-100 cursor-pointer ${
    theme === "dark"
      ? "text-[#b3b3b3] hover:text-white hover:bg-[#2d2d30]"
      : "text-[#6b7280] hover:text-[#24292f] hover:bg-[#f0f0f0]"
  }`;

  return (
    <div className="flex items-center gap-0.5">
      <span
        className={`text-[13px] font-medium tabular-nums px-1 select-none ${
          state.running
            ? theme === "dark"
              ? "text-[#e6e6e6]"
              : "text-[#24292f]"
            : theme === "dark"
            ? "text-[#b3b3b3]"
            : "text-[#6b7280]"
        }`}
      >
        {formatElapsed(elapsedMs)}
      </span>
      <button
        onClick={() => sendStopwatchEvent(state.running ? "stop" : "start")}
        className={buttonClass}
        aria-label={state.running ? "Pause stopwatch" : "Start stopwatch"}
      >
        {state.running ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        <RailTooltip
          label={state.running ? "Pause stopwatch" : "Start stopwatch"}
          side="bottom"
          theme={theme}
        />
      </button>
      {hasTime && !state.running && (
        <button
          onClick={() => sendStopwatchEvent("reset")}
          className={buttonClass}
          aria-label="Reset stopwatch"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <RailTooltip label="Reset stopwatch" side="bottom" theme={theme} />
        </button>
      )}
    </div>
  );
}
