"use client";

export default function Footer() {
  return (
    <footer className="relative w-full py-10 px-8 md:px-16 lg:px-24 border-t border-neutral-100">
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/interviewlablogo.svg"
            alt="InterviewLab"
            className="h-5 w-5 brightness-0 opacity-30"
          />
          <span className="font-body text-sm text-neutral-400">
            InterviewLab
          </span>
        </div>

        <p className="font-body text-sm text-neutral-300">
          &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
