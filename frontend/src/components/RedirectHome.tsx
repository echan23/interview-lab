import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RedirectHome() {
  const navigate = useNavigate();

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => navigate("/")}
      className={`
        h-12 w-12 rounded
        bg-transparent text-inherit shadow-none ring-0

        /* Override all hover/focus/active from the variant */
        hover:!bg-transparent hover:!text-inherit hover:!shadow-none hover:!ring-0
        focus:!bg-transparent focus:!text-inherit focus:!shadow-none focus:!ring-0
        active:!bg-transparent active:!text-inherit active:!shadow-none active:!ring-0
      `}
    >
      <img
        src="/interviewlablogo.svg"
        alt="Logo"
        className="h-10 w-10 md:h-8 md:w-8 dark:invert"
      />
    </Button>
  );
}
