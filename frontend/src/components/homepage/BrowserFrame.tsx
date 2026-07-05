interface BrowserFrameProps {
  children?: React.ReactNode;
  src?: string;
  alt?: string;
}

export default function BrowserFrame({ children, src, alt }: BrowserFrameProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)]">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>

        {/* URL bar */}
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-md bg-white border border-neutral-200 text-xs text-neutral-400 font-body">
            interviewlab.dev
          </div>
        </div>

        {/* Spacer to balance traffic lights */}
        <div className="w-[54px]" />
      </div>

      {/* Content */}
      <div className="bg-white">
        {src ? (
          <img src={src} alt={alt || ""} className="w-full h-auto block" />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
