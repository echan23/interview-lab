import type { ReactNode } from "react";

type RailTooltipProps = {
  label: ReactNode;
  side: "top" | "right" | "bottom" | "left";
  theme: string;
};

const positionClasses: Record<RailTooltipProps["side"], string> = {
  right: "left-full ml-2 top-1/2 -translate-y-1/2",
  left: "right-full mr-2 top-1/2 -translate-y-1/2",
  bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
};

/* Hover tooltip — parent needs `relative group`. */
export default function RailTooltip({ label, side, theme }: RailTooltipProps) {
  return (
    <span
      className={`absolute ${positionClasses[side]} z-50 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100 ${
        theme === "dark"
          ? "bg-[#2d2d30] text-[#e6e6e6] border border-[#3c3c3c] shadow-md"
          : "bg-white text-[#383a42] border border-[#e5e5e5] shadow-md"
      }`}
    >
      {label}
    </span>
  );
}

/* Small keyboard-key chip for use inside tooltips */
export function Kbd({ children, theme }: { children: ReactNode; theme: string }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded border text-[10px] font-sans font-medium leading-none ${
        theme === "dark"
          ? "bg-[#1e1e1e] border-[#4a4a4a] text-[#b3b3b3]"
          : "bg-[#f6f8fa] border-[#d1d5db] text-[#57606a]"
      }`}
    >
      {children}
    </kbd>
  );
}

export const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
