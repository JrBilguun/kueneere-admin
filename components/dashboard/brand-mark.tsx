import { cn } from "@/lib/utils"

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "bg-lime flex items-center justify-center text-background font-mono font-bold",
          compact ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm",
        )}
      >
        K
      </span>
      <span className={cn("font-semibold tracking-tight", compact ? "" : "text-lg")}>
        KUENEREE
      </span>
    </span>
  )
}
