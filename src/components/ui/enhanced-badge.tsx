import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const enhancedBadgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 animate-in fade-in-0 zoom-in-95",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        success: "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        info: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        gradient: "border-transparent bg-gradient-to-r from-versys-primary to-versys-secondary text-white hover:from-versys-primary/90 hover:to-versys-secondary/90",
        glass: "border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
        glow: "border-transparent bg-gradient-to-r from-versys-primary to-versys-secondary text-white shadow-lg shadow-versys-primary/25 hover:shadow-versys-primary/40",
        pulse: "border-transparent bg-gradient-to-r from-versys-primary to-versys-secondary text-white animate-pulse",
        shimmer: "border-transparent bg-gradient-to-r from-versys-primary via-versys-secondary to-versys-accent text-white relative overflow-hidden"
      },
      size: {
        sm: "h-5 px-2 text-xs",
        default: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
        xl: "h-8 px-4 text-sm"
      },
      animation: {
        none: "",
        bounce: "animate-bounce",
        pulse: "animate-pulse",
        ping: "animate-ping",
        spin: "animate-spin"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none"
    },
  }
)

export interface EnhancedBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedBadgeVariants> {
  icon?: React.ReactNode
  dot?: boolean
  interactive?: boolean
}

const EnhancedBadge = React.forwardRef<HTMLDivElement, EnhancedBadgeProps>(
  ({ className, variant, size, animation, icon, dot, interactive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          enhancedBadgeVariants({ variant, size, animation }),
          interactive && "cursor-pointer hover:scale-105 active:scale-95",
          className
        )}
        {...props}
      >
        {/* Shimmer effect para variant shimmer */}
        {variant === "shimmer" && (
          <div className="absolute inset-0 -top-1 -bottom-1 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}
        
        {/* Dot indicator */}
        {dot && (
          <div className="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />
        )}
        
        {/* Icon */}
        {icon && (
          <span className="shrink-0">
            {icon}
          </span>
        )}
        
        {/* Content */}
        <span className="relative z-10">
          {children}
        </span>
      </div>
    )
  }
)
EnhancedBadge.displayName = "EnhancedBadge"

export { EnhancedBadge, enhancedBadgeVariants } 