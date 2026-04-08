import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, value, onChange, onBlur, ...props }: React.ComponentProps<"input">) {
  // We use this state to track if the user has explicitly cleared the input.
  // This solves the React quirk where deleting a number field leaves a "0", 
  // causing subsequent typing to create "05", "010", etc.
  const [isEmpty, setIsEmpty] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === "number") {
      setIsEmpty(e.target.value === "");
    }
    onChange?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (type === "number") {
      setIsEmpty(false);
    }
    onBlur?.(e);
  };

  // If the parent is resetting it to 0 and we are marked as empty by the user, we render it as an empty string.
  // This prevents the visual "0" while keeping the parent's math (which uses 0) perfectly intact.
  const displayValue = (type === "number" && value === 0 && isEmpty) ? "" : value;

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  )
}

export { Input }
