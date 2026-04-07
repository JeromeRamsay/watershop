"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface ReadOnlyFieldProps {
  label: string;
  value?: string | number | null;
  className?: string;
  id?: string;
}

/**
 * UI-4: Renders a read-only data point as a styled label + text block.
 * Never uses <input> so the browser won't treat it as a form field.
 */
export function ReadOnlyField({
  label,
  value,
  className,
  id,
}: ReadOnlyFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label
        htmlFor={id}
        className="text-sm font-medium text-[#374151] dark:text-dark-200"
      >
        {label}
      </Label>
      <p
        id={id}
        className={cn(
          "flex min-h-[2.5rem] w-full items-center rounded-md border border-[#E5E7EB]",
          "bg-[#F9FAFB] px-3 py-2 text-sm text-[#6B7280]",
          "dark:border-dark-600 dark:bg-dark-800 dark:text-dark-400",
          "select-text cursor-default",
        )}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

