import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
  placeholder="Ask anything"
  className={cn(
    "resize-none rounded-3xl border border-gray-300 flex min-h-[80px] w-full rounded-2-xl bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    className
  )}
  ref={ref}
  {...props}
/>

  )
})
Textarea.displayName = "Textarea"

export { Textarea }
