import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-xl border border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-700 px-3 py-2 text-dark-900 dark:text-white placeholder:text-dark-400 dark:placeholder:text-dark-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
