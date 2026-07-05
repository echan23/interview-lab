import React, { useEffect } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

//Make sure that the labels match what monaco editor supports
const languageOptions = [
  {
    value: "python",
    label: "Python3",
  },
  {
    value: "java",
    label: "Java",
  },
  {
    value: "c",
    label: "C",
  },
  {
    value: "cpp",
    label: "C++",
  },
  {
    value: "javascript",
    label: "Javascript",
  },
  {
    value: "go",
    label: "Go",
  },
];

const LanguageSelector = ({
  onSelect,
}: {
  onSelect: (value: string) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("python");

  //Sets the selected language on mount
  useEffect(() => {
    onSelect(value);
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-[160px] justify-between px-2.5 text-[13px] font-medium transition-all duration-200 hover:shadow-lg group"
        >
          {value
            ? languageOptions.find((lang) => lang.value === value)?.label
            : "Select language..."}
          <ChevronsUpDownIcon className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-70 group-hover:rotate-180 transition-all duration-200" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder="Search language..." />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup>
              {languageOptions.map((lang) => (
                <CommandItem
                  key={lang.value}
                  value={lang.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue);
                    onSelect(currentValue);
                    setOpen(false);
                  }}
                  className="hover:bg-accent/50 hover:translate-x-1 transition-all duration-150 cursor-pointer"
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === lang.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {lang.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default LanguageSelector;
