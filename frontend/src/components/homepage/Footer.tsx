"use client";

export default function Footer() {
  return (
    <footer className="relative w-full py-12 px-8 md:px-16 lg:px-24">
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/interviewlablogo.svg"
            alt="InterviewLab"
            className="h-5 w-5 brightness-0 invert opacity-40"
          />
          <span className="font-body text-sm text-white/30">
            InterviewLab
          </span>
        </div>

        <p className="font-body text-sm text-white/20">
          &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
